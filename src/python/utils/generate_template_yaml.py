from ruamel.yaml import YAML
from ruamel.yaml.comments import CommentedMap, CommentedSeq

def template_call_variants(number_of_samples=1):
    samples = CommentedSeq()

    for i in range(number_of_samples):
        s = CommentedMap()
        s["id"] = None
        s.yaml_add_eol_comment("sample id", "id")
        s["platform"] = None
        s.yaml_add_eol_comment("illumina/nanopore/pacbio", "platform")
        s["read1"] = None
        s.yaml_add_eol_comment("path/to/read1/fastq/file", "read1")
        s["read2"] = None
        s.yaml_add_eol_comment("path/to/read2/fastq/file", "read2")

        samples.append(s)

    root = CommentedMap()
    root["sample"] = samples

    return root

def template_identify_hla_alleles(number_of_samples=1):
    samples = CommentedSeq()

    for i in range(number_of_samples):
        s = CommentedMap()
        s["id"] = None
        s.yaml_add_eol_comment("sample id", "id")
        s["read1"] = None
        s.yaml_add_eol_comment("path/to/read1/fastq/file", "read1")
        s["read2"] = None
        s.yaml_add_eol_comment("path/to/read2/fastq/file", "read2")

        samples.append(s)

    root = CommentedMap()
    root["sample"] = samples

    root = CommentedMap()
    root["sample"] = samples

    return root

TEMPLATE_BUILDERS = {
    "call-variants": template_call_variants,
    "identify-hla-alleles": template_identify_hla_alleles,
}

def generate_template_yaml(workflow_name: str, output_file: str, number_of_samples: int):
    if workflow_name not in TEMPLATE_BUILDERS:
        raise ValueError(f"Unknown workflow: {workflow_name}")

    yaml = YAML()
    yaml.indent(mapping=2, sequence=4, offset=2)

    template = TEMPLATE_BUILDERS[workflow_name](number_of_samples)

    with open(output_file, "w") as f:
        yaml.dump(template, f)