from decimal import Decimal

import pytest

from conftest import load, run

bh = load("bh-business/scripts/bh.py")


def test_vat_from_net():
    assert bh.vat_from_net(100) == {"net": Decimal("100.000"), "vat": Decimal("10.000"), "total": Decimal("110.000")}


def test_vat_from_gross_round_trips():
    r = bh.vat_from_gross("110")
    assert (r["net"], r["vat"]) == (Decimal("100.000"), Decimal("10.000"))


def test_invoice_vat_per_line_and_fils_rounding():
    r = bh.invoice_totals([(3, "1.333"), (1, "9.900")])
    assert r == {"net": Decimal("13.899"), "vat": Decimal("1.390"), "total": Decimal("15.289")}


@pytest.mark.parametrize("raw,expected", [
    ("33123456", "+97333123456"), ("+973 3312 3456", "+97333123456"),
    ("0097317123456", "+97317123456"), ("1234", None), ("03312345", None),
])
def test_phone(raw, expected):
    assert bh.normalise_phone(raw) == expected


def test_iban_checksum():
    assert bh.valid_iban("BH67 BMAG 0000 1299 1234 56")
    assert not bh.valid_iban("BH68BMAG00001299123456")
    assert not bh.valid_iban("SA0380000000608010167519")


def test_cpr_and_mask():
    assert bh.valid_cpr("900112345") and not bh.valid_cpr("90011234")
    assert bh.mask_cpr("900112345") == "*****2345"


def test_fmt():
    assert bh.fmt_bhd(1234.5) == "BD 1,234.500"
    assert bh.fmt_bhd(2, arabic=True) == "2.000 د.ب"


def test_cli():
    assert "total 110.000" in run("bh-business/scripts/bh.py", "vat", "100").stdout
