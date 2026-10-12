"""Bahrain business helpers: money (BHD, 3 decimals), VAT, and validators.

CLI:
  python bh.py vat 100            # net 100.000 -> vat 10.000 total 110.000
  python bh.py vat 110 --incl     # extract VAT from an inclusive price
  python bh.py phone 33123456     # normalise / validate
  python bh.py cpr 900112345
  python bh.py iban BH67BMAG00001299123456
"""
import re
import sys
from decimal import Decimal, ROUND_HALF_UP

VAT_RATE = Decimal("0.10")
FILS = Decimal("0.001")


def money(value) -> Decimal:
    return Decimal(str(value)).quantize(FILS, rounding=ROUND_HALF_UP)


def fmt_bhd(value, arabic=False) -> str:
    amount = f"{money(value):,.3f}"
    return f"{amount} د.ب" if arabic else f"BD {amount}"


def vat_from_net(net, rate=VAT_RATE) -> dict:
    net = money(net)
    vat = money(net * rate)
    return {"net": net, "vat": vat, "total": net + vat}


def vat_from_gross(gross, rate=VAT_RATE) -> dict:
    gross = money(gross)
    net = money(gross / (1 + rate))
    return {"net": net, "vat": gross - net, "total": gross}


def invoice_totals(lines, rate=VAT_RATE) -> dict:
    """lines: iterable of (qty, unit_price). VAT is computed per line, then summed."""
    net = vat = Decimal("0")
    for qty, price in lines:
        line = vat_from_net(Decimal(str(qty)) * Decimal(str(price)), rate)
        net += line["net"]
        vat += line["vat"]
    return {"net": net, "vat": vat, "total": net + vat}


def normalise_phone(raw: str) -> str | None:
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("00973"):
        digits = digits[5:]
    elif digits.startswith("973") and len(digits) == 11:
        digits = digits[3:]
    return f"+973{digits}" if re.fullmatch(r"[1-9]\d{7}", digits) else None


def valid_cpr(raw: str) -> bool:
    return re.fullmatch(r"\d{9}", raw.strip()) is not None


def valid_iban(raw: str) -> bool:
    iban = raw.replace(" ", "").upper()
    if not re.fullmatch(r"BH\d{2}[A-Z]{4}[A-Z0-9]{14}", iban):
        return False
    rearranged = iban[4:] + iban[:4]
    numeric = "".join(str(int(c, 36)) for c in rearranged)
    return int(numeric) % 97 == 1


def mask_cpr(raw: str) -> str:
    return "*****" + raw[-4:]


def _main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1
    cmd, arg = argv[0], argv[1]
    if cmd == "vat":
        r = vat_from_gross(arg) if "--incl" in argv else vat_from_net(arg)
        print(f"net {r['net']}  vat {r['vat']}  total {r['total']}")
    elif cmd == "phone":
        print(normalise_phone(arg) or "invalid")
    elif cmd == "cpr":
        print("valid" if valid_cpr(arg) else "invalid")
    elif cmd == "iban":
        print("valid" if valid_iban(arg) else "invalid")
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
