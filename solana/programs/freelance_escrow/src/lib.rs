//! Freelance escrow on Solana (Anchor).
//! - Business deposits SOL into a PDA escrow.
//! - Requirements file is represented by a SHA-256 hash (off-chain file).
//! - Business sets the hash; freelancer must acknowledge the same hash.
//! - Both parties must approve before funds move to the freelancer (`release_mutual`).
//! - After `deadline_unix`, if mutual approval did not happen, `mock_ai_arbiter` may
//!   settle (`mock_ai_resolve`). Off-chain "AI analysis" is mocked — only this key's
//!   signature authorizes settlement on-chain.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;

declare_id!("8wDwDU4jLuocr7bAAfbZeyJ4axNNmgaxZ9HQ7wnhTjoU");

#[program]
pub mod freelance_escrow {
    use super::*;

    pub fn create_escrow(ctx: Context<CreateEscrow>, args: CreateEscrowArgs) -> Result<()> {
        require!(args.amount_expected_lamports > 0, EscrowError::ZeroAmount);
        require!(ctx.accounts.freelancer.key() != Pubkey::default(), EscrowError::InvalidFreelancer);
        require!(args.mock_ai_arbiter != Pubkey::default(), EscrowError::InvalidArbiter);

        let escrow = &mut ctx.accounts.escrow;
        escrow.business = ctx.accounts.business.key();
        escrow.freelancer = ctx.accounts.freelancer.key();
        escrow.mock_ai_arbiter = args.mock_ai_arbiter;
        escrow.project_id = args.project_id;
        escrow.amount_expected_lamports = args.amount_expected_lamports;
        escrow.deadline_unix = args.deadline_unix;
        escrow.requirements_hash = [0u8; 32];
        escrow.business_set_requirements = false;
        escrow.freelancer_ack_requirements = false;
        escrow.freelancer_approved = false;
        escrow.business_approved = false;
        escrow.deposited = false;
        escrow.released = false;
        escrow.bump = ctx.bumps.escrow;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>) -> Result<()> {
        let lamports = {
            let e = &ctx.accounts.escrow;
            require!(!e.released, EscrowError::AlreadyReleased);
            require!(!e.deposited, EscrowError::AlreadyDeposited);
            require_keys_eq!(ctx.accounts.business.key(), e.business);
            e.amount_expected_lamports
        };

        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.business.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            lamports,
        )?;

        ctx.accounts.escrow.deposited = true;
        Ok(())
    }

    pub fn set_requirements_hash(ctx: Context<SetRequirements>, hash: [u8; 32]) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(!escrow.released, EscrowError::AlreadyReleased);
        require_keys_eq!(ctx.accounts.business.key(), escrow.business);

        escrow.requirements_hash = hash;
        escrow.business_set_requirements = true;
        escrow.freelancer_ack_requirements = false;
        escrow.freelancer_approved = false;
        escrow.business_approved = false;
        Ok(())
    }

    pub fn freelancer_ack_requirements(ctx: Context<FreelancerAck>, hash: [u8; 32]) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(!escrow.released, EscrowError::AlreadyReleased);
        require_keys_eq!(ctx.accounts.freelancer.key(), escrow.freelancer);
        require!(escrow.business_set_requirements, EscrowError::RequirementsUnset);
        require!(hash == escrow.requirements_hash, EscrowError::HashMismatch);

        escrow.freelancer_ack_requirements = true;
        escrow.freelancer_approved = false;
        escrow.business_approved = false;
        Ok(())
    }

    pub fn approve_freelancer(ctx: Context<FreelancerApprove>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(!escrow.released, EscrowError::AlreadyReleased);
        require!(escrow.deposited, EscrowError::NotDeposited);
        require!(escrow.freelancer_ack_requirements, EscrowError::RequirementsNotAcked);
        require_keys_eq!(ctx.accounts.freelancer.key(), escrow.freelancer);

        escrow.freelancer_approved = true;
        Ok(())
    }

    pub fn approve_business(ctx: Context<BusinessApprove>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(!escrow.released, EscrowError::AlreadyReleased);
        require!(escrow.deposited, EscrowError::NotDeposited);
        require!(escrow.freelancer_ack_requirements, EscrowError::RequirementsNotAcked);
        require_keys_eq!(ctx.accounts.business.key(), escrow.business);

        escrow.business_approved = true;
        Ok(())
    }

    pub fn release_mutual(ctx: Context<ReleaseMutual>) -> Result<()> {
        {
            let escrow = &ctx.accounts.escrow;
            require!(!escrow.released, EscrowError::AlreadyReleased);
            require!(escrow.deposited, EscrowError::NotDeposited);
            require!(escrow.business_approved && escrow.freelancer_approved, EscrowError::NotFullyApproved);
            require_keys_eq!(ctx.accounts.freelancer.key(), escrow.freelancer);

            transfer_escrow_balance(&ctx.accounts.escrow, ctx.accounts.freelancer.to_account_info())?;
        }
        ctx.accounts.escrow.released = true;
        Ok(())
    }

    pub fn mock_ai_resolve(ctx: Context<MockAiResolve>, release_to_freelancer: bool) -> Result<()> {
        let recipient = {
            let escrow = &ctx.accounts.escrow;
            let clock = Clock::get()?;
            require!(!escrow.released, EscrowError::AlreadyReleased);
            require!(escrow.deposited, EscrowError::NotDeposited);
            require!(
                clock.unix_timestamp >= escrow.deadline_unix,
                EscrowError::DeadlineNotReached
            );
            require!(
                !(escrow.business_approved && escrow.freelancer_approved),
                EscrowError::UseMutualRelease
            );
            require_keys_eq!(ctx.accounts.mock_ai_arbiter.key(), escrow.mock_ai_arbiter);

            if release_to_freelancer {
                require_keys_eq!(ctx.accounts.freelancer.key(), escrow.freelancer);
                ctx.accounts.freelancer.to_account_info()
            } else {
                require_keys_eq!(ctx.accounts.business.key(), escrow.business);
                ctx.accounts.business.to_account_info()
            }
        };

        transfer_escrow_balance(&ctx.accounts.escrow, recipient)?;

        ctx.accounts.escrow.released = true;
        Ok(())
    }
}

fn transfer_escrow_balance<'info>(
    escrow: &Account<'info, EscrowState>,
    recipient: AccountInfo<'info>,
) -> Result<()> {
    let escrow_ai = escrow.to_account_info();
    let rent_min = Rent::get()?.minimum_balance(escrow_ai.data_len());
    let total = escrow_ai.lamports();
    let payout = total.checked_sub(rent_min).ok_or(error!(EscrowError::NothingToPay))?;
    require!(payout > 0, EscrowError::NothingToPay);

    let project_id = escrow.project_id.to_le_bytes();
    let seeds: &[&[u8]] = &[
        b"escrow",
        escrow.business.as_ref(),
        escrow.freelancer.as_ref(),
        project_id.as_ref(),
        &[escrow.bump],
    ];

    invoke_signed(
        &anchor_lang::solana_program::system_instruction::transfer(
            &escrow_ai.key(),
            &recipient.key(),
            payout,
        ),
        &[escrow_ai, recipient],
        &[seeds],
    )?;

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateEscrowArgs {
    pub project_id: u64,
    pub amount_expected_lamports: u64,
    pub deadline_unix: i64,
    pub mock_ai_arbiter: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowState {
    pub business: Pubkey,
    pub freelancer: Pubkey,
    pub mock_ai_arbiter: Pubkey,
    pub project_id: u64,
    pub amount_expected_lamports: u64,
    pub deadline_unix: i64,
    pub requirements_hash: [u8; 32],
    pub business_set_requirements: bool,
    pub freelancer_ack_requirements: bool,
    pub freelancer_approved: bool,
    pub business_approved: bool,
    pub deposited: bool,
    pub released: bool,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(args: CreateEscrowArgs)]
pub struct CreateEscrow<'info> {
    #[account(mut)]
    pub business: Signer<'info>,
    /// CHECK: freelancer pubkey stored for routing payouts
    pub freelancer: UncheckedAccount<'info>,
    #[account(
        init,
        payer = business,
        space = 8 + EscrowState::INIT_SPACE,
        seeds = [
            b"escrow",
            business.key().as_ref(),
            freelancer.key().as_ref(),
            &args.project_id.to_le_bytes(),
        ],
        bump
    )]
    pub escrow: Account<'info, EscrowState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub business: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.business.as_ref(),
            escrow.freelancer.as_ref(),
            &escrow.project_id.to_le_bytes(),
        ],
        bump = escrow.bump,
        has_one = business @ EscrowError::UnauthorizedBusiness,
    )]
    pub escrow: Account<'info, EscrowState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetRequirements<'info> {
    pub business: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.business.as_ref(),
            escrow.freelancer.as_ref(),
            &escrow.project_id.to_le_bytes(),
        ],
        bump = escrow.bump,
        has_one = business @ EscrowError::UnauthorizedBusiness,
    )]
    pub escrow: Account<'info, EscrowState>,
}

#[derive(Accounts)]
pub struct FreelancerAck<'info> {
    pub freelancer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.business.as_ref(),
            escrow.freelancer.as_ref(),
            &escrow.project_id.to_le_bytes(),
        ],
        bump = escrow.bump,
        constraint = escrow.freelancer == freelancer.key() @ EscrowError::UnauthorizedFreelancer,
    )]
    pub escrow: Account<'info, EscrowState>,
}

#[derive(Accounts)]
pub struct FreelancerApprove<'info> {
    pub freelancer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.business.as_ref(),
            escrow.freelancer.as_ref(),
            &escrow.project_id.to_le_bytes(),
        ],
        bump = escrow.bump,
        constraint = escrow.freelancer == freelancer.key() @ EscrowError::UnauthorizedFreelancer,
    )]
    pub escrow: Account<'info, EscrowState>,
}

#[derive(Accounts)]
pub struct BusinessApprove<'info> {
    pub business: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.business.as_ref(),
            escrow.freelancer.as_ref(),
            &escrow.project_id.to_le_bytes(),
        ],
        bump = escrow.bump,
        has_one = business @ EscrowError::UnauthorizedBusiness,
    )]
    pub escrow: Account<'info, EscrowState>,
}

#[derive(Accounts)]
pub struct ReleaseMutual<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.business.as_ref(),
            escrow.freelancer.as_ref(),
            &escrow.project_id.to_le_bytes(),
        ],
        bump = escrow.bump,
        constraint = escrow.freelancer == freelancer.key() @ EscrowError::UnauthorizedFreelancer,
    )]
    pub escrow: Account<'info, EscrowState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MockAiResolve<'info> {
    #[account(mut)]
    pub mock_ai_arbiter: Signer<'info>,
    #[account(mut)]
    pub business: SystemAccount<'info>,
    #[account(mut)]
    pub freelancer: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.business.as_ref(),
            escrow.freelancer.as_ref(),
            &escrow.project_id.to_le_bytes(),
        ],
        bump = escrow.bump,
        constraint = escrow.business == business.key() @ EscrowError::UnauthorizedBusiness,
        constraint = escrow.freelancer == freelancer.key() @ EscrowError::UnauthorizedFreelancer,
    )]
    pub escrow: Account<'info, EscrowState>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Invalid freelancer")]
    InvalidFreelancer,
    #[msg("Invalid mock AI arbiter")]
    InvalidArbiter,
    #[msg("Escrow already released")]
    AlreadyReleased,
    #[msg("Deposit already completed")]
    AlreadyDeposited,
    #[msg("Caller is not the recorded business")]
    UnauthorizedBusiness,
    #[msg("Caller is not the recorded freelancer")]
    UnauthorizedFreelancer,
    #[msg("Requirements hash was not set yet")]
    RequirementsUnset,
    #[msg("Requirements hash does not match")]
    HashMismatch,
    #[msg("Freelancer must acknowledge requirements first")]
    RequirementsNotAcked,
    #[msg("Funds have not been deposited")]
    NotDeposited,
    #[msg("Both parties must approve before mutual release")]
    NotFullyApproved,
    #[msg("Deadline has not passed yet")]
    DeadlineNotReached,
    #[msg("Mutual approval reached — use release_mutual")]
    UseMutualRelease,
    #[msg("Nothing available to pay after rent reserve")]
    NothingToPay,
}
