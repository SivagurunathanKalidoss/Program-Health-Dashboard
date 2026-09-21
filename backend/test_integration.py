import unittest

from integration import IntegrationConfig, IntegrationError, UnifiedDashboardFeed


class IntegrationTests(unittest.TestCase):
    def test_mock_feed_contains_dashboard_summary(self):
        config = IntegrationConfig(mock_mode=True)
        feed = UnifiedDashboardFeed(config).generate_feed("APP-123")

        self.assertEqual(feed["project"], "enterprise-it")
        self.assertEqual(feed["application"], "APP-123")
        self.assertEqual(feed["summary"]["slaCompliance"], 96.4)
        self.assertIn("availability", feed)
        self.assertIn("health", feed)

    def test_live_config_requires_all_credentials(self):
        config = IntegrationConfig(
            servicenow_url="https://sn.example",
            servicenow_user="user",
            servicenow_pass="",
            dynatrace_url="https://dt.example",
            dynatrace_token="",
            mock_mode=False,
        )

        with self.assertRaises(IntegrationError):
            config.validate()

    def test_duration_minutes_supports_utc_z_suffix(self):
        self.assertEqual(
            UnifiedDashboardFeed._duration_minutes(
                "2026-09-21T10:00:00Z", "2026-09-21T11:42:00Z"
            ),
            102,
        )


if __name__ == "__main__":
    unittest.main()
