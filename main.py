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

parser = argparse.ArgumentParser(
    prog="forge",
    description="Forge: Bioinformatics workflow for sequencing analysis",
    epilog="Use 'forge <command> -h' for more information on a command.",
    formatter_class=lambda prog: argparse.HelpFormatter(prog, max_help_position=70, width=100),
    )

subparsers = parser.add_subparsers(
    dest="group", 
    title="groups",
    help="Available groups"
)

workflow_parser = subparsers.add_parser(
    "workflow",
    help="Workflow pipelines",
    formatter_class=lambda prog: argparse.RawTextHelpFormatter(prog, max_help_position=70, width=1000),
)

workflow_subparsers = workflow_parser.add_subparsers(
    dest="workflow_command",
    title="workflow commands",
    help="Available workflows"
)

# ----- call-variants -----
call_variants_parser = workflow_subparsers.add_parser(
    "call-variants", 
    help="Run variant calling pipeline",
    formatter_class=lambda prog: argparse.RawTextHelpFormatter(prog, max_help_position=70, width=1000),
    )

call_variants_required_arguments = call_variants_parser.add_argument_group(
    title="Required arguments",
    description=None
)

call_variants_required_arguments.add_argument(
    "-I", "--input",
    required = True, 
    type = str, 
    dest="input",
    metavar="<YAML>",
    help="Path to the YAML configuration file (e.g., run.yaml)"
)

call_variants_required_arguments.add_argument(
    "-O", "--output",
    required = True, 
    type = str, 
    dest="output",
    metavar="<directory>",
    help="Path to the directory where results will be stored (e.g., ~/result/)"
)

call_variants_required_arguments.add_argument(
    "-R","--reference-genome",
    required = True,
    dest="reference_genome",
    metavar="<FASTA>",
    help="Reference genome FASTA file (e.g. hg19.fa)"
)

call_variants_optional_arguments = call_variants_parser.add_argument_group(
    title="Optional arguments",
    description=None
)

call_variants_optional_arguments.add_argument(
    "-r", "--regions",
    dest="regions",
    metavar="<BED>",
    help=(
        "Genomic regions to process. Accepts BED file"
    )
)

call_variants_optional_arguments.add_argument(
    "--bqsr-known-sites",
    nargs="+",
    dest="bqsr_known_sites",
    metavar="<VCF>",
    help="List of known sites for Base Quality Score Recalibration (e.g., dbsnp.vcf.gz mills.vcf.gz)"
)

def parse_standard_annotation_resources_block(items):
    allowed = {
        "clinvar",
        "dbnsfp",
        "esp6500",
        "phase3_1000g",
        "dbsnp_138"
    }

    standard_annotation_resources = {}

    for item in items:
        if "=" not in item:
            parser.error(
                f"Invalid format '{item}'. Use key=path"
            )

        key, value = item.split("=", 1)

        if key not in allowed:
            parser.error(
                f"Unknown annotation resource: {key}"
            )

        if key in standard_annotation_resources:
            parser.error(f"Duplicate annotation resource: {key}")

        standard_annotation_resources[key] = value

    return standard_annotation_resources
    
call_variants_optional_arguments.add_argument(
    "--standard-annotation-resources",      
    nargs="+",
    metavar="<KEY=PATH>",  
    type=str,
    help=(
        "Grouped annotation resources.\n"
    )
)

call_variants_optional_arguments.add_argument(
    "-t", "--threads",
    type=int,
    default=4,
    metavar="<INT>",
    help="Number of threads to use (default: 4)"
)

call_variants_optional_arguments.add_argument(
    "--min-memory",
    type=int,
    default=8,
    metavar="<GB>",
    help="Minimum memory in GB (default: 8)"
)

call_variants_optional_arguments.add_argument(
    "--max-memory",
    type=int,
    default=16,
    metavar="<GB>",
    help="Maximum memory in GB (default: 16)"
)
# ----- identify-hla-alleles -----

identify_hla_alleles_parser = workflow_subparsers.add_parser(
    "identify-hla-alleles", 
    help="Run HLA typing pipeline",
    formatter_class=lambda prog: argparse.RawTextHelpFormatter(prog, max_help_position=70, width=1000),
    )

identify_hla_alleles_required_arguments = identify_hla_alleles_parser.add_argument_group(
    title="Required arguments",
    description=None
)

identify_hla_alleles_required_arguments.add_argument(
    "-I", "--input",
    required = True, 
    type = str, 
    dest="input",
    metavar="<YAML>",
    help="Path to the YAML configuration file (e.g., run.yaml)"
)

identify_hla_alleles_required_arguments.add_argument(
    "-O", "--output",
    required = True, 
    type = str, 
    dest="output",
    metavar="<directory>",
    help="Path to the directory where results will be stored (e.g., ~/result/)"
)

identify_hla_alleles_arguments = identify_hla_alleles_parser.add_argument_group(
    title="Optional arguments",
    description=None
)

identify_hla_alleles_arguments.add_argument(
    "-t", "--threads",
    type=int,
    default=4,
    metavar="<INT>",
    help="Number of threads to use (default: 4)"
)

# --------------------
arguments = parser.parse_args()

if arguments.group is None:
    parser.print_help()
    sys.exit(1)

if arguments.group == "workflow" and arguments.workflow_command is None:
    workflow_parser.print_help()
    sys.exit(1)

match (arguments.group, arguments.workflow_command):
    case ("workflow", "call-variants"):
        input_yaml_file_path = arguments.input
        output_dir_path = arguments.output
        reference_genome_file_path = arguments.reference_genome
        bqsr_known_sites = arguments.bqsr_known_sites 
        regions_file_path = arguments.regions
        setup_logging(
            logger_name = "logger",
            log_file_path = f"{arguments.output}/log/workflow.runtime.log",
            log_to_file = True
        )
        logger = logging.getLogger("logger")
        standard_annotation_resources_dict = {}

        if arguments.standard_annotation_resources:
            standard_annotation_resources_dict = parse_standard_annotation_resources_block(arguments.standard_annotation_resources)

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
            "standard_annotation_resources_dict": standard_annotation_resources_dict,
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
        # context_yaml = yaml.dump(context["input_data"], sort_keys=False, default_flow_style=False ).rstrip()
        # logger.info(f"Input information:\n{context_yaml}")

        context_json = json.dumps(context)
        # print(json.dumps(context, indent=4))
        try:
            subprocess.run(
                [
                    "bash", f"{pathlib.Path(__file__).parent}/scripts/bash/call_variants.sh",
                    context_json
                ], 
                shell=False, 
                check=True
                )
        except KeyboardInterrupt:
            pass
        finally:
            sys.exit(0) 
    case ("workflow", "identify-hla-alleles"):
        input_yaml_file_path = arguments.input
        output_dir_path = arguments.output
        threads = arguments.threads

        input_data = load_yaml_file(input_yaml_file_path)

        setup_logging(
            logger_name = "logger",
            log_file_path = f"{arguments.output}/log/runtime.log",
            log_to_file = True
        )
        logger = logging.getLogger("logger")

        compute = {
            "threads": threads,
            }
        config_data = {
            "compute": compute,
        }
        context = {
            "input_data": input_data,
            "output_dir_path": output_dir_path,
            "config_data": config_data
        }
        context_yaml = yaml.dump(context["input_data"], sort_keys=False, default_flow_style=False ).rstrip()
        logger.info(f"Input information:\n{context_yaml}")

        context_json = json.dumps(context)
        try:
            subprocess.run(
                [
                    "bash", f"{pathlib.Path(__file__).parent}/scripts/bash/identify_hla_alleles.sh",
                    context_json
                ], 
                shell=False, 
                check=True
                )
        except KeyboardInterrupt:
            pass
        finally:
            sys.exit(0) 
    case None:
        parser.print_help()
