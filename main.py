import sys

sys.dont_write_bytecode = True
import argparse
import subprocess
import yaml
import json
import pathlib
import logging
from src.python.utils.setup_logging import setup_logging
from src.python.utils.load_yaml_file import load_yaml_file

setup_logging(
    logger_name = "logger",
    log_file_path = f"{pathlib.Path(__file__).parent}/log/monitoring.log",
    log_to_file = True
)
logger = logging.getLogger("logger")

parser = argparse.ArgumentParser(
    prog="forge",
    description="Forge: Variant calling pipeline for Whole Exome Sequencing (WES) data",
    epilog="Use 'forge <command> -h' for more information on a command.",
    formatter_class=lambda prog: argparse.HelpFormatter(prog, max_help_position=70, width=100),
    )

subparsers = parser.add_subparsers(
    dest="command", 
    title="subcommands",
    )

# ---- callvariants ----
callvariants_parser = subparsers.add_parser(
    "callvariants", 
    help="Run variant calling pipeline",
    formatter_class=lambda prog: argparse.RawTextHelpFormatter(prog, max_help_position=70, width=1000),
    )

callvariants_parser.add_argument(
    "-I", "--input",
    required = True, 
    type = str, 
    dest="input",
    metavar="<YAML>",
    help="Path to the YAML configuration file (e.g., run.yaml)"
)

callvariants_parser.add_argument(
    "-O", "--output",
    required = True, 
    type = str, 
    dest="output",
    metavar="<directory>",
    help="Path to the directory where results will be stored (e.g., ~/result/)"
)

callvariants_parser.add_argument(
    "-R","--reference-genome",
    required = True,
    dest="reference_genome",
    metavar="<FASTA>",
    help="Reference genome FASTA file (e.g. hg19.fa)"
)

callvariants_parser.add_argument(
    "-r", "--regions",
    dest="regions",
    metavar="<BED>",
    help=(
        "Genomic regions to process. Accepts BED file"
    )
)

callvariants_parser.add_argument(
    "--bqsr-known-sites",
    nargs="+",
    dest="bqsr_known_sites",
    metavar="<VCF>",
    help="List of known sites for Base Quality Score Recalibration (e.g., dbsnp.vcf.gz mills.vcf.gz)"
)

def parse_annotation(argument):
    try:
        key, value = argument.split("=", 1)
        return key.lower(), value
    except ValueError:
        raise argparse.ArgumentTypeError(
            "Format must be TYPE=VCF"
        )
    
callvariants_parser.add_argument(
    "--annotation-resource",
    nargs="+",               
    action="append",          
    type=parse_annotation,
    metavar="<TYPE=VCF>",
    help=(
        "Annotation resources. Can be used in two forms:\n"
        " --annotation-resource dbsnp=1.vcf\n"
        " --annotation-resource dbsnp=1.vcf clinvar=2.vcf\n"
        "Available types: dbsnp_138, clinvar, dbnsfp, phase1_1000g_indels, "
        "esp6500si_v2_ssa137, phase3_1000g_v4_20130502, omni2_5_1000g."
    )
)

callvariants_parser.add_argument(
    "-t", "--threads",
    type=int,
    default=4,
    metavar="<INT>",
    help="Number of threads to use (default: 4)"
)

callvariants_parser.add_argument(
    "--min-memory",
    type=int,
    default=8,
    metavar="<GB>",
    help="Minimum memory in GB (default: 8)"
)

callvariants_parser.add_argument(
    "--max-memory",
    type=int,
    default=16,
    metavar="<GB>",
    help="Maximum memory in GB (default: 16)"
)
# ----------------------

arguments = parser.parse_args()

if arguments.command is None:
    parser.print_help()
    exit(0)

input_yaml_file_path = arguments.input
output_dir_path = arguments.output
reference_genome_file_path = arguments.reference_genome
bqsr_known_sites = arguments.bqsr_known_sites 
regions_file_path = arguments.regions


annotation_resource_dict = {}

for group in arguments.annotation_resource or []:
    for key, value in group:
        if key in annotation_resource_dict:
            parser.error(f"Duplicate annotation resource for '{key}'")
        annotation_resource_dict[key] = value

threads = arguments.threads
min_memory_gb = arguments.min_memory
max_memory_gb = arguments.max_memory

if min_memory_gb > max_memory_gb:
    parser.error("--min-memory cannot be greater than --max-memory")

input_data = load_yaml_file(input_yaml_file_path)


compute = {
    "threads": threads,
    "min_memory_gb": min_memory_gb,
    "max_memory_gb": max_memory_gb
    }
resources = {
    "reference_genome_file_path": reference_genome_file_path,
    "bqsr_known_sites": bqsr_known_sites,
    "annotation_resource_dict": annotation_resource_dict,
    "regions_file_path": regions_file_path,
}
config_data = {
    "compute": compute,
    "resources": resources
}

context = {
    "input_data": input_data,
    "output_dir_path": output_dir_path,
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
