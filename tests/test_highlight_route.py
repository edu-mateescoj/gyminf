import json
import unittest
from unittest.mock import MagicMock, patch

import app as gyminf_app_module


class HighlightRouteTests(unittest.TestCase):
    def setUp(self):
        gyminf_app_module.app.config['TESTING'] = True
        self.client = gyminf_app_module.app.test_client()

    def test_requires_authentication(self):
        response = self.client.post('/log/highlight_event', json={
            'code_id': 1,
            'action_type': 'select'
        })

        self.assertEqual(response.status_code, 401)

    @patch.object(gyminf_app_module, 'get_user_id', return_value=7)
    def test_logs_highlight_event_when_authenticated(self, mock_get_user_id):
        fake_cursor = MagicMock()
        fake_connection = MagicMock()
        fake_connection.cursor.return_value = fake_cursor
        fake_mysql = MagicMock()
        fake_mysql.connection = fake_connection

        payload = {
            'code_id': 12,
            'node_id': 'node05',
            'action_type': 'select',
            'node_label': 'x > 0',
            'source_span': {
                'lineno': 1,
                'end_lineno': 1,
                'col_offset': 3,
                'end_col_offset': 8
            }
        }

        with patch.object(gyminf_app_module, 'mysql', fake_mysql):
            with self.client.session_transaction() as session_state:
                session_state['username'] = 'alice'

            response = self.client.post('/log/highlight_event', json=payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'success')
        mock_get_user_id.assert_called_once_with('alice')
        fake_cursor.execute.assert_called_once()

        query, params = fake_cursor.execute.call_args[0]
        self.assertIn('INSERT INTO highlight_event', query)
        self.assertEqual(params[0], 7)
        self.assertEqual(params[1], 12)
        self.assertEqual(params[2], 'node05')
        self.assertEqual(params[3], 'select')
        self.assertEqual(params[4], 'x > 0')
        self.assertEqual(json.loads(params[5]), payload['source_span'])
        fake_connection.commit.assert_called_once()


if __name__ == '__main__':
    unittest.main()