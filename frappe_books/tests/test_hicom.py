"""Hicom Books branding settings and the /books guard."""

from types import SimpleNamespace
from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase, UnitTestCase
from werkzeug.exceptions import HTTPException

from frappe_books.hicom import branding, guard, response


class UnitTestGuardPaths(UnitTestCase):
	def test_guarded_paths(self):
		for path in (
			"/desk",
			"/desk/",
			"/desk/sales-invoice",
			"/app",
			"/app/user",
			"/apps",
			"/attribution",
			"/me",
		):
			with self.subTest(path=path):
				self.assertTrue(guard.is_guarded_path(path))

	def test_open_paths(self):
		for path in (
			"/books",
			"/books/edit/SalesInvoice/x",
			"/login",
			"/api/method/ping",
			"/printview",
			"/media",
			"/apple",
		):
			with self.subTest(path=path):
				self.assertFalse(guard.is_guarded_path(path))


class UnitTestGeneratorMeta(UnitTestCase):
	def test_html_loses_the_generator_meta(self):
		from werkzeug.wrappers import Response

		html = Response(
			'<head><meta name="generator" content="frappe"><title>x</title></head>', mimetype="text/html"
		)
		response.strip_generator_meta(html, None)
		self.assertEqual(html.get_data(as_text=True), "<head><title>x</title></head>")

	def test_other_responses_are_left_alone(self):
		from werkzeug.wrappers import Response

		body = '{"generator": "<meta name=\\"generator\\" content=\\"frappe\\">"}'
		json = Response(body, mimetype="application/json")
		response.strip_generator_meta(json, None)
		self.assertEqual(json.get_data(as_text=True), body)
		response.strip_generator_meta(None, None)


class IntegrationTestGuard(IntegrationTestCase):
	def run_guard(self, user: str, path: str, method: str = "GET"):
		request = SimpleNamespace(path=path, method=method)
		with patch.object(frappe.local, "request", request, create=True), self.set_user(user):
			guard.redirect_to_books()

	def test_client_user_is_sent_to_books(self):
		with self.assertRaises(HTTPException) as raised:
			self.run_guard("Guest", "/desk")
		response = raised.exception.response
		self.assertEqual((response.status_code, response.headers["Location"]), (302, "/books"))

	def test_administrator_keeps_the_desk(self):
		self.run_guard("Administrator", "/desk")

	def test_open_paths_and_posts_pass(self):
		self.run_guard("Guest", "/books")
		self.run_guard("Guest", "/desk", method="POST")


class IntegrationTestBranding(IntegrationTestCase):
	def test_apply_branding_sets_every_value_and_is_idempotent(self):
		branding.apply_branding()
		for doctype, values in (
			("Website Settings", branding.WEBSITE_SETTINGS),
			("System Settings", branding.SYSTEM_SETTINGS),
			("Navbar Settings", branding.NAVBAR_SETTINGS),
		):
			doc = frappe.get_single(doctype)
			for key, value in values.items():
				with self.subTest(doctype=doctype, field=key):
					self.assertEqual(doc.get(key), value)

		modified = frappe.db.get_single_value("Website Settings", "modified")
		branding.apply_branding()
		self.assertEqual(frappe.db.get_single_value("Website Settings", "modified"), modified)

	def test_framework_pages_use_the_product_name(self):
		from frappe.email.email_body import get_brand_name

		branding.apply_branding()
		self.assertEqual(get_brand_name(), "Hicom Books")
