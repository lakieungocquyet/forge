import sys

sys.dont_write_bytecode = True
import argparse
import subprocess
import yaml
import json
import pathlib
import logging
from src.utils.setup_logging import setup_logging

def load_yaml_file(yaml_file_path):
    with open(f"{yaml_file_path}", "r") as f:
        return yaml.safe_load(f)
    
setup_logging(
    logger_name = "logger",
    log_file_path = f"{pathlib.Path(__file__).parent}/log/monitoring.log",
    log_to_file = True
)
logger = logging.getLogger("logger")

parser = argparse.ArgumentParser(
        description = "Run variant calling pipeline"
    )
parser.add_argument(
    "-I", "--input",
    required = True, 
    type = str, 
    help = "Path to YAML configuration file"
)
arguments = parser.parse_args()

input_yaml_file_path = arguments.input
config_yaml_file_path = pathlib.Path(__file__).parent/"config"/"forge.config.yaml"

input_data = load_yaml_file(input_yaml_file_path)
config_data = load_yaml_file(config_yaml_file_path)

context = {
    "input_data": input_data,
    "config_data": config_data
}
context_yaml = yaml.dump(context["input_data"], sort_keys=False, default_flow_style=False ).rstrip()
logger.info(f"Input information:\n{context_yaml}")

context_json = json.dumps(context)
# print(json.dumps(context, indent=4))

subprocess.run(
    [
        "bash", f"{pathlib.Path(__file__).parent}/scripts/bash/secondary_data_analysis.sh",
        context_json
    ], 
    shell=False, 
    check=True
    )

subprocess.run(
    [
        "bash", f"{pathlib.Path(__file__).parent}/scripts/bash/tertiary_data_analysis.sh",
        context_json
    ], 
    shell=False, 
    check=True
    )
