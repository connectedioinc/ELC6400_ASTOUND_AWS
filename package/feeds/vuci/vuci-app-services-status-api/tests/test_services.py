import sys
import utility_integration as util
from utils.general_api import is_package_installed, get_board, get_serial_devices
from time import sleep
from utils.ssh import open_ssh_connection, send_cmd
sys.path.append("../../../../tests")

class test_services_status(util.WrapTest):
    def test_services_status_base_functionality(self):
        base_url = "/services/status"
        board = get_board(self)

        with self.subTest("check_response_options"):
            x = self.get(base_url)
            resp = x.resp
            options = ["enabled", "service", "status", "path"]
            for section in resp.json()["data"]:
                self.assertListEqual(sorted(section.keys()), sorted(options))
            x.assert_code(200)

        with self.subTest("check_response_data"):
            x = self.get(base_url)
            resp = x.resp
            possible_statuses = ["1", "0", "2"]
            possible_states = ["Disabled", "Down", "Running", "Standby"]
            for section in resp.json()["data"]:
                self.assertIn(section["enabled"], possible_statuses)
                self.assertIn(section["status"], possible_states)

        with self.subTest("check_expected_services"):
            main_services = {
                "OpenVPN", "PPTP", "IPsec", "Ping/Wget Reboot",
                "Reboot Scheduler", "Events Reporting", "SSH", "GRE",
                "L2TP", "L2TPv3", "Wireguard"
            }
            if board.get("hwinfo", {}).get("bluetooth", False):
                main_services.add("Bluetooth")
            if board.get("hwinfo", {}).get("ios", False):
                main_services.update(["Input/Output Juggler", "Input/Output Scheduler"])
            if board.get("hwinfo", {}).get("gps", False):
                main_services.add("GPS")
            installable_services = {
                "azure": ["Azure IoT Hub"],
                "cumulocity": ["Cumulocity"],
                "cloud_of_things": ["Cloud of Things"],
                "data_to_server": ["Data To Server"],
                "ddns": ["DDNS"],
                "dnp3": ["DNP3 Outstation", "DNP3 TCP Client"],
                "hotspot": ["Hotspot"],
                "igmp_proxy": ["IGMP Proxy"],
                "modbus_client": ["Modbus TCP Client"],
                "modbus_server": ["Modbus TCP Server"],
                "mqtt": ["MQTT Broker", "MQTT Publisher"],
                "mqtt_modbus_gateway": ["MQTT Modbus Gateway"],
                "pam": ["PAM"],
                "smpp": ["SMPP"],
                "snmp": ["SNMP", "SNMP Trap"],
                "sshfs": ["SSHFS"],
                "sstp": ["SSTP"],
                "stunnel": ["Stunnel"],
                "thingworkx": ["ThingWorx"],
                "tinc": ["Tinc"],
                "upnp": ["UPnP"],
                "vrrp": ["VRRP"],
                "wake_on_lan": ["Wake on LAN"],
                "web_filter": ["Web Filter"],
                "zerotier": ["ZeroTier"],
                "minidlna": ["DLNA"],
                "ntrip_client": ["NTRIP"],
                "events_reporting": ["Events Reporting"],
                "telnet": ["Telnet"],
                "samba": ["Network Shares"],
                "aws": ["AWS"],
                "email_relay": ["Email Relay"],
                "opcua": ["OPC UA Client"],
                "opcua_server": ["OPC UA Server"],
                "bacnet": ["BACnet configuration"],
                "hotspot_2_0": ["Hotspot 2.0"],
                "impulse_counter": ["Impulse counter"],
                "traffic_logging": ["Traffic Logging"],
                "dmvpn": ["DMVPN"],
                "wake_on_lan": ["Wake on LAN"],
                "wifi_scanner": ["Wifi Scanner"],
                "dlms": ["DLMS"],
                "tailscale": ["Tailscale"],
                "printer_server": ["Printer Server"],
                "rms": ["RMS"]
            }

            expected_services = list(main_services)

            for package, services in installable_services.items():
                installed = is_package_installed(self, package)
                if installed:
                    expected_services.extend(services)

            x = self.get(base_url)
            resp = x.resp.json()
            actual_services = [service["service"] for service in resp["data"]]

            missing_services = [service for service in expected_services if service not in actual_services]

            self.assertEqual(len(missing_services), 0, f"Missing services for all devices: {', '.join(missing_services)}")

        with self.subTest("check_expected_services_for_serial_devices"):
            serial = get_serial_devices()
            if not serial:
                self.skipTest("No serial devices found")
            expected_services_for_serial_devices = [
                "Modbus Serial Server", "Modbus Serial Client"
            ]
            if not util.Env().device.startswith("x86"):
                expected_services_for_serial_devices.extend(["Modbus TCP over Serial Gateway"])
            if is_package_installed(self, "dnp3"):
                expected_services_for_serial_devices.extend(["DNP3 Serial Outstation", "DNP3 Serial Client"])

            x = self.get(base_url)
            resp = x.resp.json()
            actual_services = [service["service"] for service in resp["data"]]

            missing_services = [service for service in expected_services_for_serial_devices if service not in actual_services]
            self.assertEqual(len(missing_services), 0, f"Missing services for serial devices: {', '.join(missing_services)}")
        with self.subTest("check_status_change"):

            def assert_status(expected_enabled, expected_status, service):
                attempt_limit = 30
                attempt_count = 0

                while attempt_count < attempt_limit:
                    x = self.get(base_url)
                    resp = x.resp.json()
                    status = next((item for item in resp["data"] if item["service"] == service), None)
                    if status is not None and status["enabled"] == expected_enabled and status["status"] == expected_status:
                        break
                    attempt_count += 1
                    sleep(1)
                self.assertIsNotNone(status, f"{service} service not found in response")
                self.assertEqual(status["enabled"], expected_enabled, f"{service} enabled status should be {expected_enabled}")
                self.assertEqual(status["status"], expected_status, f"{service} status should be {expected_status}")
            self.put_data("/access_control/ssh/config", [{"enabled": "0", "id": "general"}])
            assert_status("0", "Disabled", "SSH")
            self.put_data("/access_control/ssh/config", [{"enabled": "1", "id": "general"}])
            assert_status("1", "Running", "SSH")
            if is_package_installed(self, "rms"):
                self.put_data("/rms/config/rms_connect_mqtt", {"enable": "1"})
                assert_status("1", "Running", "RMS")
                with open_ssh_connection() as ssh:
                    send_cmd(ssh, "kill $(pgrep rms_mqtt)")
                assert_status("1", "Down", "RMS")
