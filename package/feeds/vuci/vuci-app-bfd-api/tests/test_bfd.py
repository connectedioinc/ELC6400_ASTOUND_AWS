from utils.general_api import is_package_installed
import utility_integration as util
import sys
sys.path.append("../../../../tests")

bfd_installed = None


def check_bfd_installed(self):
    global bfd_installed
    if bfd_installed is None:
        bfd_installed = is_package_installed(self, "bfd")
    return bfd_installed


class test_bfd_peers(util.WrapTest):
    url = "/bfd/peers/config"
    sid = None
    options = {
        "enabled": "0"
    }

    def setUp(self):
        if not check_bfd_installed(self):
            self.skipTest("BFD package is not installed")

    def test_bfd_peer_functionality(self):
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, self.options)
            self.sid = x.resp.json()["data"]["id"]
            response_options = self.options.copy()
            response_options["id"] = self.sid
            response_options[".type"] = "peer"
            x.assert_data(response_options, 201)
        with self.subTest("edit_configuration"):
            edit_options = {
                "enabled": "1",
                "passive_mode": "1",
                "ip": "192.168.10.14",
                "multihop_ip": "192.168.2.40",
                "detect_multiplier": "5",
                "transmit_interval": "430",
                "receive_interval": "900"
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            edit_options[".type"] = "peer"
            edit_options["id"] = self.sid
            x.assert_data(edit_options, 200)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })


class test_bfd_profiles(util.WrapTest):
    url = "/bfd/profiles/config"
    sid = None
    options = {
        "name": "fast"
    }

    def setUp(self):
        if not check_bfd_installed(self):
            self.skipTest("BFD package is not installed")

    def test_bfd_profile_functionality(self):
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, self.options)
            self.sid = x.resp.json()["data"]["id"]
            response_options = self.options.copy()
            response_options["id"] = self.sid
            response_options[".type"] = "profile"
            x.assert_data(response_options, 201)
        with self.subTest("edit_configuration"):
            edit_options = {
                "name": "slow",
                "transmit_interval": "5000",
                "receive_interval": "9000"
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            edit_options[".type"] = "profile"
            edit_options["id"] = self.sid
            x.assert_data(edit_options, 200)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })


class test_bfd_peers_profiles(util.WrapTest):
    url = "/bfd/peers/config"
    url2 = "/bfd/profiles/config"
    sid_peer = None
    sid_profile = None
    options_peer = {
        "enabled": "1",
        "passive_mode": "1",
        "ip": "192.168.10.14",
        "multihop_ip": "192.168.2.40",
        "detect_multiplier": "5"
    }
    options_profile = {
        "name": "slow",
        "transmit_interval": "5000",
        "receive_interval": "9000"
    }

    def setUp(self):
        if not check_bfd_installed(self):
            self.skipTest("BFD package is not installed")

    def test_bfd_peer_profile_functionality(self):
        with self.subTest("create_profile_configuration"):
            x = self.post_data(self.url2, self.options_profile)
            self.sid_profile = x.resp.json()["data"]["id"]
            response_options = self.options_profile.copy()
            response_options["id"] = self.sid_profile
            response_options[".type"] = "profile"
            x.assert_data(response_options, 201)
        with self.subTest("create_peer_configuration"):
            self.options_peer["profile"] = self.sid_profile
            x = self.post_data(self.url, self.options_peer)
            self.sid_peer = x.resp.json()["data"]["id"]
            response_options = self.options_peer.copy()
            response_options["id"] = self.sid_peer
            response_options[".type"] = "peer"
            x.assert_data(response_options, 201)
        with self.subTest("delete_profile"):
            x = self.delete(self.url2 + "/" + self.sid_profile)
            y = self.get(
                self.url + "/" + self.sid_peer)
            response_options = self.options_peer.copy()
            self.options_peer[".type"] = "peer"
            self.options_peer["id"] = self.sid_peer
            del self.options_peer["profile"]
            y.assert_data(self.options_peer)
            x.assert_data({
                "id": self.sid_profile
            })
        with self.subTest("delete_peer"):
            x = self.delete(self.url + "/" + self.sid_peer)
            x.assert_data({
                "id": self.sid_peer
            })
