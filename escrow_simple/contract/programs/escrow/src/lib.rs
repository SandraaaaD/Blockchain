use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke;

// Replace this with the output of: solana-keygen new -o keypair.json && solana address -k keypair.json
declare_id!("GD7qTgFPQt9nJFGodZFtoGsrbgmuDUk1NFezCjNiJsoM");

#[program]
pub mod escrow {
    use super::*;

    /// Business creates an escrow, specifying the freelancer and a SHA-256 hash
    /// of the requirements document.
    pub fn create(
        ctx: Context<Create>,
        freelancer: Pubkey,
        requirements_hash: [u8; 32],
    ) -> Result<()> {
        let e = &mut ctx.accounts.escrow;
        e.business = ctx.accounts.business.key();
        e.freelancer = freelancer;
        e.requirements_hash = requirements_hash;
        e.work_hash = [0u8; 32];
        e.amount = 0;
        e.state = EscrowState::Created;
        e.bump = ctx.bumps.escrow;
        Ok(())
    }

    /// Business deposits SOL into the escrow account.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts.escrow.state == EscrowState::Created,
            EscrowError::InvalidState
        );
        require!(amount > 0, EscrowError::ZeroAmount);

        let ix = system_instruction::transfer(
            &ctx.accounts.business.key(),
            &ctx.accounts.escrow.key(),
            amount,
        );
        invoke(
            &ix,
            &[
                ctx.accounts.business.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
            ],
        )?;

        ctx.accounts.escrow.amount = amount;
        ctx.accounts.escrow.state = EscrowState::Funded;
        Ok(())
    }

    /// Freelancer submits a SHA-256 hash of their delivered work.
    pub fn submit_work(ctx: Context<SubmitWork>, work_hash: [u8; 32]) -> Result<()> {
        let e = &mut ctx.accounts.escrow;
        require!(e.state == EscrowState::Funded, EscrowError::InvalidState);
        require!(
            ctx.accounts.freelancer.key() == e.freelancer,
            EscrowError::Unauthorized
        );
        e.work_hash = work_hash;
        e.state = EscrowState::WorkSubmitted;
        Ok(())
    }

    /// Business (or mock AI client acting on behalf of business) releases funds
    /// to the freelancer after approving the submitted work.
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let e = &mut ctx.accounts.escrow;
        require!(e.state == EscrowState::WorkSubmitted, EscrowError::InvalidState);
        require!(
            ctx.accounts.business.key() == e.business,
            EscrowError::Unauthorized
        );

        let amount = e.amount;
        e.amount = 0;
        e.state = EscrowState::Released;

        // Move lamports from escrow PDA to freelancer.
        // This is allowed because our program owns the PDA.
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.freelancer.try_borrow_mut_lamports()? += amount;
        Ok(())
    }

    /// Business can reclaim funds if the freelancer has not yet submitted work.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let e = &mut ctx.accounts.escrow;
        require!(e.state == EscrowState::Funded, EscrowError::InvalidState);
        require!(
            ctx.accounts.business.key() == e.business,
            EscrowError::Unauthorized
        );

        let amount = e.amount;
        e.amount = 0;
        e.state = EscrowState::Refunded;

        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.business.try_borrow_mut_lamports()? += amount;
        Ok(())
    }
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(mut)]
    pub business: Signer<'info>,
    #[account(
        init,
        payer = business,
        space = 8 + EscrowAccount::SIZE,
        seeds = [b"escrow", business.key().as_ref()],
        bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub business: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", business.key().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitWork<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", escrow.business.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut)]
    pub business: Signer<'info>,
    /// CHECK: we only credit lamports; we verify the key matches escrow.freelancer below
    #[account(mut, address = escrow.freelancer)]
    pub freelancer: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"escrow", business.key().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub business: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", business.key().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

// ─── State ───────────────────────────────────────────────────────────────────

#[account]
pub struct EscrowAccount {
    pub business: Pubkey,         // 32
    pub freelancer: Pubkey,       // 32
    pub requirements_hash: [u8; 32], // 32  SHA-256 of requirements doc
    pub work_hash: [u8; 32],      // 32  SHA-256 of submitted work
    pub amount: u64,              // 8
    pub state: EscrowState,       // 1
    pub bump: u8,                 // 1
}

impl EscrowAccount {
    pub const SIZE: usize = 32 + 32 + 32 + 32 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowState {
    Created,
    Funded,
    WorkSubmitted,
    Released,
    Refunded,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum EscrowError {
    #[msg("Operation not allowed in current state")]
    InvalidState,
    #[msg("Caller is not authorized")]
    Unauthorized,
    #[msg("Deposit amount must be greater than zero")]
    ZeroAmount,
}
