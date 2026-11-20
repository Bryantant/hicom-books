"""Site settings that put the Hicom Books name and logo on the framework's own pages.

The login, password, message and error pages, emails and the browser tab read these
settings, and fall back to the framework's name and logo when they are empty.
"""

import frappe

PRODUCT_NAME = "Hicom Books"
COMPANY_NAME = "Hicom System"
LOGO = "/assets/frappe_books/books-icon.png"
FAVICON = "/assets/frappe_books/pwa/icon-192.png"

WEBSITE_SETTINGS = {
	"app_name": PRODUCT_NAME,
	"app_logo": LOGO,
	"favicon": FAVICON,
	"splash_image": LOGO,
	# Replaces the "Built on ..." line in the footer of the framework's web pages.
	"footer_powered": COMPANY_NAME,
	"disable_signup": 1,
}

SYSTEM_SETTINGS = {
	"app_name": PRODUCT_NAME,
	"default_app": "frappe_books",
	"disable_system_update_notification": 1,
	"disable_change_log_notification": 1,
	"disable_product_suggestion": 1,
}

NAVBAR_SETTINGS = {"app_logo": LOGO}


def apply_branding() -> None:
	"""Set the Hicom Books branding on this site. Safe to run again: it only writes what differs."""
	_set_single("Website Settings", WEBSITE_SETTINGS)
	_set_single("System Settings", SYSTEM_SETTINGS)
	_set_single("Navbar Settings", NAVBAR_SETTINGS)
	frappe.clear_cache()


def _set_single(doctype: str, values: dict) -> None:
	doc = frappe.get_single(doctype)
	fields = {df.fieldname for df in doc.meta.fields}
	changed = {key: value for key, value in values.items() if key in fields and doc.get(key) != value}
	if not changed:
		return
	doc.update(changed)
	doc.flags.ignore_permissions = True
	doc.flags.ignore_mandatory = True  # a fresh site's singles may lack values the setup wizard fills later
	doc.save()
