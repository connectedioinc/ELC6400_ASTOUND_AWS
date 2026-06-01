import sys
import io
from time import sleep, time

sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes
from utils.vpn import firewall_must_be_clean
from utils.ssh import get_ssh
import json


class zerotier(util.WrapTest):
    planet_file = """
    {
      "id": "deadbeef00",
      "objtype": "world",
      "roots": [
        {
          "identity": "deadbeef00:0:34031483094...",
          "stableEndpoints": []
        }
      ],
      "signingKey": "b324d84cec708d1b51d5ac03e75afba501a12e2124705ec34a614bf8f9b2c800f44d9824ad3ab2e3da1ac52ecb39ac052ce3f54e58d8944b52632eb6d671d0e0",
      "signingKey_SECRET": "ffc5dd0b2baf1c9b220d1c9cb39633f9e2151cf350a6d0e67c913f8952bafaf3671d2226388e1406e7670dc645851bf7d3643da701fd4599fedb9914c3918db3",
      "updatesMustBeSignedBy": "b324d84cec708d1b51d5ac03e75afba501a12e2124705ec34a614bf8f9b2c800f44d9824ad3ab2e3da1ac52ecb39ac052ce3f54e58d8944b52632eb6d671d0e0",
      "worldType": "moon"
    }
"""

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    zerotier_url = "/zerotier/config"
    created_instance_ids = []

    def test_clean_firewall(self):
        id = "tester"
        with firewall_must_be_clean(self):
            self.post_data(self.zerotier_url, {"id": id})
            self.put_data(f"{self.zerotier_url}/{id}", {"enabled": "1"})
            self.delete(f"{self.zerotier_url}/{id}")

    def create_instance(self, instance_id):
        # first zerotier
        x = self.post_data(self.zerotier_url, {"id": instance_id, "name": instance_id})
        instance_id = x.json["data"]["id"]
        url_put = self.zerotier_url + "/" + instance_id
        i_template = x.json["data"]
        ## enabled
        x = self.put_data(url_put, {"enabled": "1"})
        i_template.update({"enabled": "1"})
        self.created_instance_ids.append(instance_id)
        return i_template

    def create_network(self, instance_id, name):
        # first zerotier
        instances = self.get(self.zerotier_url).json
        for instance in instances.get("data", []):
            if instance.get("name") == instance_id:
                instance_id = instance.get("id")
                break
        network_url = "/zerotier/" + instance_id + "/networks/config/"
        x = self.post_data(network_url, {"id": name, "name": name})
        n_id = x.json["data"]["id"]
        url_put = "/zerotier/" + instance_id + "/networks/config/" + n_id
        n_template = x.json["data"]
        port = str(9993 + int(n_id))
        ## network_id
        x = self.put_data(url_put, {"network_id": n_id * 17})
        x.assert_error(
            "network_id",
            "Provided value is too long. Is 17 characters, but can be up to 16 characters",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"network_id": n_id * 15})
        x.assert_error(
            "network_id",
            "Provided value is too short. Is 15 characters, but can not be shorter than 16 characters",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"network_id": n_id * 16})
        n_template.update({"network_id": n_id * 16})
        ## enabled
        x = self.put_data(url_put, {"enabled": "1"})
        n_template.update({"enabled": "1"})
        ## name
        x = self.put_data(url_put, {"name": name + "_test"})
        x = self.put_data(
            url_put,
            {"name": "_test_longer_than_32_characters_+"},
        )
        x.assert_error(
            "name",
            "Provided value is too long. Is 33 characters, but can be up to 32 characters",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"name": ""})
        x.assert_error(
            "name",
            "Option can not be empty",
            103,
            None,
            None,
        )
        n_template.update({"name": name + "_test"})
        ## port
        x = self.put_data(url_put, {"port": port})
        if n_id == "6":
            x = self.put_data(url_put, {"port": "9998"})
            x.assert_error(
                "port",
                "Port is used in another network configuration.",
                103,
                None,
                None,
            )
        n_template.update({"port": port})
        ## allow default
        x = self.put_data(url_put, {"allow_default": "2"})
        x.assert_error(
            "allow_default",
            "Provided value is not '1' or '0'.",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"allow_default": "1"})
        n_template.update({"allow_default": "1"})
        ## allow global
        x = self.put_data(url_put, {"allow_global": "1"})
        x = self.put_data(url_put, {"allow_global": "2"})
        x.assert_error(
            "allow_global",
            "Provided value is not '1' or '0'.",
            103,
            None,
            None,
        )
        n_template.update({"allow_global": "1"})
        ## allow dns
        x = self.put_data(url_put, {"allow_dns": "1"})
        x = self.put_data(url_put, {"allow_dns": "2"})
        x.assert_error(
            "allow_dns",
            "Provided value is not '1' or '0'.",
            103,
            None,
            None,
        )
        n_template.update({"allow_dns": "1"})
        ## bridge_to
        x = self.put_data(url_put, {"bridge_to": "hq"})
        x.assert_error(
            "bridge_to",
            "Must be one of the following values [none, lan].",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"bridge_to": "lan"})
        br_lan_conf = self.ssh.send_cmd("uci show network.br_lan")
        device_name = self.ssh.send_cmd("/etc/init.d/zerotier get_ifname " + x.json["data"]["network_id"]).strip()
        self.assertIn(device_name, br_lan_conf)
        x = self.put_data(url_put, {"bridge_to": "none"})
        n_template.update({"bridge_to": "none"})
        ## custom planet file
        f = io.StringIO(self.planet_file)
        x = self.send_file(url_put, f, "custom_planet_file")
        x.assert_code(200)
        self.put_data(url_put, {"custom_planet_file": x.json["data"]["path"]})
        n_template.update({"custom_planet_file": x.json["data"]["path"]})

        return n_template

    def delete_instances(self):
        for instance_id in self.created_instance_ids:
            self.delete(f"{self.zerotier_url}/{instance_id}")

    def check_interfaces(self):
        for instance_id in self.created_instance_ids:
            networks = self.get(f"/zerotier/{instance_id}/networks/config").json
            for network in networks.get("data", []):
                network_id = network.get("network_id")
                interface = self.ssh.send_cmd(
                    f"/etc/init.d/zerotier get_ifname {network_id}"
                ).strip()
                start_time = time()
                while time() - start_time < 120:  # 2 minutes timeout
                    output = self.ssh.send_cmd(f"ip link show dev {interface}")
                    if interface in output:
                        self.ssh.send_cmd(
                            f'logger -t "ZEROTIER_test" "Interface {interface} for network {network_id} exists"'
                        )
                        break
                    sleep(1)

    def test_main(self):
        with self.subTest("create_instance_put"):
            self.ssh.send_cmd(
                'logger -t "ZEROTIER_test" "Creating instances using PUT"'
            )
            template_i1 = self.create_instance("i_1")
            template_n1 = self.create_network("i_1", "n_1")
            template_n2 = self.create_network("i_1", "n_2")
            template_i2 = self.create_instance("i_2")
            template_n3 = self.create_network("i_2", "n_3")
            template_n4 = self.create_network("i_2", "n_4")

        self.check_interfaces()
        self.delete_instances()

        with self.subTest("create_instance_post"):
            self.ssh.send_cmd(
                'logger -t "ZEROTIER_test" "Creating instances using POST"'
            )
            self.post_data(self.zerotier_url, template_i1)
            self.post_data("/zerotier/1/networks/config", template_n1)
            self.post_data("/zerotier/1/networks/config", template_n2)
            self.post_data(self.zerotier_url, template_i2)
            self.post_data("/zerotier/4/networks/config", template_n3)
            self.post_data("/zerotier/4/networks/config", template_n4)

        self.check_interfaces()
        self.delete_instances()
