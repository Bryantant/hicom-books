"""Remove the framework's name from the HTML of its own pages (login, password, message and error pages)."""

# Hardcoded in the framework's templates/base.html, so no setting can turn it off.
GENERATOR_META = b'<meta name="generator" content="frappe">'


def strip_generator_meta(response, request) -> None:
	"""`after_request` hook: drop the generator meta tag from HTML responses."""
	if response is None or response.direct_passthrough or response.mimetype != "text/html":
		return
	body = response.get_data()
	if GENERATOR_META in body:
		response.set_data(body.replace(GENERATOR_META, b""))
