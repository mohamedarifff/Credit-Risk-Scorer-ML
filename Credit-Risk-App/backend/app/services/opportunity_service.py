from app.schemas import FinancialProfile, LoanMatch, Opportunity
from app.services.eligibility_service import load_loan_products


def _months_for_dti_gap(profile: FinancialProfile, target_dti: float) -> int:
    gap = profile.debt_to_income_ratio - target_dti
    if gap <= 0:
        return 3
    return min(24, max(6, int(gap * 24)))


def _months_for_late_payments(count: int) -> int:
    if count == 0:
        return 3
    return min(18, 6 + count * 4)


def get_roadmap(
    profile: FinancialProfile,
    ineligible_loans: list[LoanMatch],
    all_matches: list[LoanMatch],
) -> list[Opportunity]:
    products = {p.id: p for p in load_loan_products()}
    match_by_id = {m.product_id: m for m in all_matches}
    opportunities: list[Opportunity] = []

    targets = ineligible_loans or [m for m in all_matches if m.approval_likelihood == "Low"]

    for match in targets:
        product = products.get(match.product_id)
        if not product:
            continue

        gaps: list[str] = []
        steps: list[str] = []
        months_candidates: list[int] = []

        if profile.debt_to_income_ratio > product.max_dti:
            gaps.append(
                f"Your DTI is {profile.debt_to_income_ratio:.2f}, requirement is < {product.max_dti:.2f}"
            )
            steps.append(
                f"Pay down existing debt to bring DTI below {product.max_dti:.2f} "
                f"(reduce monthly obligations by ~₹{(profile.debt_to_income_ratio - product.max_dti) * profile.annual_income / 12:,.0f})"
            )
            months_candidates.append(_months_for_dti_gap(profile, product.max_dti))

        if profile.annual_income < product.min_income:
            gaps.append(
                f"Annual income ₹{profile.annual_income:,.0f} is below ₹{product.min_income:,.0f}"
            )
            steps.append(
                f"Increase verifiable annual income by ₹{product.min_income - profile.annual_income:,.0f} "
                "or add a co-applicant"
            )
            months_candidates.append(12)

        if profile.late_payments_last_12m > product.max_late_payments:
            gaps.append(
                f"{profile.late_payments_last_12m} late payments in 12m; max allowed {product.max_late_payments}"
            )
            steps.append("Set up auto-debit and maintain on-time payments for 12 consecutive months")
            months_candidates.append(_months_for_late_payments(profile.late_payments_last_12m))

        if profile.employment_years < product.min_employment_years:
            gaps.append(
                f"Employment tenure {profile.employment_years:.1f}y; need {product.min_employment_years:.1f}y"
            )
            steps.append(
                f"Continue current employment for {product.min_employment_years - profile.employment_years:.1f} more years"
            )
            months_candidates.append(
                max(6, int((product.min_employment_years - profile.employment_years) * 12))
            )

        if product.requires_collateral and profile.existing_investments < product.min_amount * 0.1:
            gaps.append("Secured product requires documented collateral or investments")
            steps.append(
                f"Build collateral pool toward at least ₹{product.min_amount * 0.1:,.0f} in investments or assets"
            )
            months_candidates.append(9)

        if not gaps:
            gaps.append(f"Borderline approval for {match.product_name} — strengthen overall credit profile")
            steps.append("Reduce discretionary spending and increase monthly savings by 10–15%")
            months_candidates.append(6)

        if not steps:
            continue

        eligible_match = match_by_id.get(match.product_id)
        unlocks = eligible_match.max_amount if eligible_match else product.min_amount

        opportunities.append(
            Opportunity(
                product_id=match.product_id,
                product_name=match.product_name,
                current_gap="; ".join(gaps),
                action_steps=steps,
                estimated_months=max(months_candidates) if months_candidates else 6,
                unlocks_amount=round(unlocks, 0),
            )
        )

    opportunities.sort(key=lambda o: o.estimated_months)
    return opportunities
