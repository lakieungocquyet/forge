function prepare_vcf_file() {
    local input_file_path="$1"
    local is_bgzf=false
    local input_file_type

    if [[ ! -f "$input_file" ]]; then
        logger ERROR "File not found: $input_file"
        return 1
    fi

    # Detect BGZF
    
    input_file_type=$(htsfile "$input_file_path" 2>/dev/null || true)

    
    if echo "$input_file_type" | grep -qi "BGZF"; then
        is_bgzf=true
    fi

    # Function: index file
    index_vcf() {
        local f="$1"
        if [[ -f "${f}.tbi" ]]; then
            echo "✅ Index already exists: ${f}.tbi"
        else
            echo "📌 Creating index for $f"
            tabix -p vcf "$f"
        fi
    }

    # MAIN LOGIC
    if $is_bgzf; then
        echo "✅ File is BGZF: $input_file"
        index_vcf "$input_file"
    else
        echo "⚠️ Not BGZF. Re-compressing..."

        local output_file
        output_file="${input_file%.gz}.vcf.gz"

        if [[ "$input_file" == *.gz ]]; then
            zcat "$input_file" | bgzip > "$output_file"
        else
            bgzip -c "$input_file" > "$output_file"
        fi

        echo "✅ Compressed to: $output_file"

        echo "📌 Indexing..."
        tabix -p vcf "$output_file"
    fi
}