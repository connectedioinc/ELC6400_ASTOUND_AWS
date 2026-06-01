import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest

class DNP3Outstation(WrapTest):
    url = "/dnp3/outstation/config/general"

    def test_tcp_update(self):
        self.put_data(self.url, {
            "allow_ra": "0",
            "enabled": "1",
            "local_addr": "10",
            "port": "20000",
            "protocol": "tcp",
            "remote_addr": "20",
            "unsolicited_enabled": "0"
        }).assert_data({
            "enabled": "1",
            ".type": "dnp3_outstation",
            "protocol": "tcp",
            "id": "general",
            "port": "20000",
            "local_addr": "10",
            "allow_ra": "0",
            "remote_addr": "20",
            "unsolicited_enabled": "0"
        })

    def test_udp_update(self):
        self.put_data(self.url, {
            "allow_ra": "0",
            "enabled": "1",
            "local_addr": "10",
            "port": "20000",
            "protocol": "udp",
            "remote_addr": "20",
            "udp_response_ip": "1.1.1.1",
            "udp_response_port": "30",
            "unsolicited_enabled": "0"
        }).assert_data({
            "enabled": "1",
            "local_addr": "10",
            "udp_response_ip": "1.1.1.1",
            "id": "general",
            "udp_response_port": "30",
            "port": "20000",
            ".type": "dnp3_outstation",
            "allow_ra": "0",
            "remote_addr": "20",
            "protocol": "udp",
            "unsolicited_enabled": "0"
        })

    def test_switching_protocols(self):
        """
            When switching from UDP to tcp, udp_response_port and udp_response_ip should be deleted from configuration
        """
        self.put_data(self.url, {
            "allow_ra": "0",
            "enabled": "0",
            "local_addr": "10",
            "port": "20000",
            "protocol": "udp",
            "remote_addr": "20",
            "udp_response_ip": "1.1.1.1",
            "udp_response_port": "30",
            "unsolicited_enabled": "0"
        }).assert_code(200)
        response = self.put_data(self.url, {
            "allow_ra": "0",
            "enabled": "1",
            "local_addr": "10",
            "port": "20000",
            "protocol": "tcp",
            "remote_addr": "20",
            "unsolicited_enabled": "0"
        })
        response.assert_code(200)
        json = response.resp.json()["data"]
        self.assertNotIn("udp_response_ip", json)
        self.assertNotIn("udp_response_port", json)
