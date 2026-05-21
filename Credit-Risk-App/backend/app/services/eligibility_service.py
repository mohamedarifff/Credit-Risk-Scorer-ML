import json
import re
from functools import lru_cache
from pathlib import Path

from app.schemas import FinancialProfile, LoanMatch, LoanProduct

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def parse_rate_midpoint(rate_range: str) -> float:
    nums = re.findall(r"[\d.]+", rate_range)
    if len(nums) >= 2:
        return (float(nums[0]) + float(nums[1])) / 2
    if nums:
        return float(nums[0])
    return 12.0


def calc_emi(principal: float, annual_rate_pct: float, tenure_months: int) -> float:
    if principal <= 0 or tenure_months <= 0:
        return 0.0
    monthly_rate = annual_rate_pct / 12 / 100
    if monthly_rate == 0:
        return principal / tenure_months
    factor = (1 + monthly_rate) ** tenure_months
    return principal * monthly_rate * factor / (factor - 1)


@lru_cache
def load_loan_products() -> list[LoanProduct]:
    with open(DATA_DIR / "loan_products.json", encoding="utf-8") as f:
        raw = json.load(f)
    return [LoanProduct(**item) for item in raw]


def _income_cap(profile: FinancialProfile, product: LoanProduct) -> float:
    """Rough max principal from income and DTI headroom."""
    monthly_income = profile.annual_income / 12
    max_emi = monthly_income * product.max_dti
    rate = parse_rate_midpoint(product.typical_rate_range)
    tenure = product.default_tenure_months
    monthly_rate = rate / 12 / 100
    if monthly_rate == 0:
        return min(product.max_amount, max_emi * tenure)
    factor = (1 + monthly_rate) ** tenure
    principal = max_emi * (factor - 1) / (monthly_rate * factor)
    return min(product.max_amount, max(principal, product.min_amount))


def _check_hard_criteria(profile: FinancialProfile, product: LoanProduct) -> tuple[bool, list[str]]:
    failures: list[str] = []
    if profile.annual_income < product.min_income:
        failures.append(
            f"Annual income ₹{profile.annual_income:,.0f} is below minimum ₹{product.min_income:,.0f}"
        )
    if profile.debt_to_income_ratio > product.max_dti:
        failures.append(
            f"DTI {profile.debt_to_income_ratio:.2f} exceeds limit {product.max_dti:.2f}"
        )
    if profile.late_payments_last_12m > product.max_late_payments:
        failures.append(
            f"{profile.late_payments_last_12m} late payments exceed allowed {product.max_late_payments}"
        )
    if profile.employment_years < product.min_employment_years:
        failures.append(
            f"Employment {profile.employment_years:.1f}y is below required {product.min_employment_years:.1f}y"
        )
    if product.requires_collateral and profile.existing_investments < product.min_amount * 0.1:
        failures.append(
            "Insufficient collateral assets (existing investments too low for secured product)"
        )
    return len(failures) == 0, failures


def _approval_likelihood(
    default_prob: float, hard_ok: bool, soft_score: int
) -> tuple[str, bool]:
    if not hard_ok:
        return "Ineligible", False
    if default_prob < 0.3 and soft_score >= 80:
        return "High", True
    if default_prob < 0.55 and soft_score >= 55:
        return "Medium", True
    if soft_score >= 35:
        return "Low", True
    return "Ineligible", False


def _soft_score(profile: FinancialProfile, product: LoanProduct, default_prob: float) -> int:
    score = 100
    income_ratio = min(profile.annual_income / product.min_income, 2.0)
    score += int((income_ratio - 1) * 10) if income_ratio > 1 else int((income_ratio - 1) * 20)
    dti_headroom = product.max_dti - profile.debt_to_income_ratio
    score += int(dti_headroom * 40)
    score -= int(default_prob * 40)
    score -= profile.late_payments_last_12m * 8
    score -= max(0, profile.num_existing_loans - 2) * 5
    if profile.credit_history_years >= 3:
        score += 5
    if profile.monthly_savings > profile.annual_income / 24:
        score += 5
    return max(0, min(100, score))


def _blocking_and_improvements(
    profile: FinancialProfile,
    product: LoanProduct,
    hard_failures: list[str],
    default_prob: float,
    max_amount: float,
) -> tuple[list[str], list[str]]:
    blocking: list[str] = []
    improvements: list[str] = []

    if max_amount < product.max_amount:
        blocking.append(
            f"Max eligible ₹{max_amount:,.0f} is below product ceiling ₹{product.max_amount:,.0f} due to income/DTI"
        )

    for msg in hard_failures:
        improvements.append(msg.replace("is below", "Increase to at least").replace("exceeds", "Reduce to under"))

    if default_prob >= 0.3:
        improvements.append("Lower credit risk score below 30% by reducing late payments and DTI")
    if profile.debt_to_income_ratio > product.max_dti * 0.9:
        improvements.append(f"Target DTI under {product.max_dti:.2f} by paying down existing debt")
    if profile.late_payments_last_12m > 0:
        improvements.append("Maintain 12 months of on-time payments")

    if not improvements and not blocking:
        blocking.append("Limited headroom — consider shorter tenure or larger down payment")

    return blocking, improvements


def get_eligible_loans(profile: FinancialProfile, default_prob: float) -> list[LoanMatch]:
    products = load_loan_products()
    matches: list[LoanMatch] = []

    for product in products:
        hard_ok, hard_failures = _check_hard_criteria(profile, product)
        soft = _soft_score(profile, product, default_prob)
        likelihood, eligible = _approval_likelihood(default_prob, hard_ok, soft)

        income_cap = _income_cap(profile, product)
        max_amount = income_cap if hard_ok else 0.0
        if max_amount < product.min_amount:
            max_amount = 0.0
            if hard_ok:
                hard_ok = False
                hard_failures.append(
                    f"Affordable amount below product minimum ₹{product.min_amount:,.0f}"
                )
                likelihood, eligible = "Ineligible", False

        rate = parse_rate_midpoint(product.typical_rate_range)
        emi = calc_emi(max_amount, rate, product.default_tenure_months) if max_amount > 0 else 0.0

        blocking, improvements = _blocking_and_improvements(
            profile, product, hard_failures, default_prob, max_amount
        )

        matches.append(
            LoanMatch(
                product_id=product.id,
                product_name=product.name,
                category=product.category,
                match_score=soft if hard_ok else max(0, soft // 2),
                approval_likelihood=likelihood,  # type: ignore[arg-type]
                max_amount=round(max_amount, 0),
                est_monthly_emi=round(emi, 0),
                eligible=eligible,
                blocking_factors=blocking if eligible else hard_failures + blocking,
                required_improvements=improvements,
            )
        )

    matches.sort(key=lambda m: (-int(m.eligible), -m.match_score, m.product_name))
    return matches
