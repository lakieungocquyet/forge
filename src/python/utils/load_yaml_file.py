import yaml

def load_yaml_file(yaml_file_path):
    with open(f"{yaml_file_path}", "r") as f:
        return yaml.safe_load(f)