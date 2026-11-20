"""Keep client users in /books: the desk and the framework's own pages are for Administrator only."""

import frappe
from werkzeug.exceptions import HTTPException
from werkzeug.utils import redirect

BOOKS_ROUTE = "/books"
ALLOWED_USER = "Administrator"
# Paths that lead out of /books to pages that show the framework.
GUARDED_PREFIXES = ("/desk", "/app", "/apps", "/attribution", "/me", "/update-profile")


def is_guarded_path(path: str) -> bool:
	path = path.rstrip("/") or "/"
	return any(path == prefix or path.startswith(prefix + "/") for prefix in GUARDED_PREFIXES)


def redirect_to_books() -> None:
	"""`before_request` hook: send everyone but Administrator from a guarded page to /books."""
	request = getattr(frappe.local, "request", None)
	if not request or request.method not in ("GET", "HEAD"):
		return
	if frappe.session.user == ALLOWED_USER or not is_guarded_path(request.path):
		return
	# The app returns an HTTPException's response as it is, before any page is rendered.
	raise HTTPException(response=redirect(BOOKS_ROUTE, code=302))
