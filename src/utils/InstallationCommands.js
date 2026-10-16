export const generateInstallationCommands = (version, os, method, packageManager) => {
    const commands = [];
    
    switch(method) {
        case 'docker':
            commands.push('# Docker has specific installation instructions for each operating system.');
            commands.push('# Please refer to the official documentation at https://docker.com/get-started/');
            commands.push('');
            commands.push('# Pull the Varkit Docker image:');
            commands.push(`docker pull varkit/varkit:${version}`);
            commands.push('');
            commands.push('# Create a Varkit container and start a Shell session:');
            commands.push(`docker run -it --rm --entrypoint sh varkit/varkit:${version}`);
            commands.push('');
            commands.push('# Verify the Varkit version:');
            commands.push(`varkit --version # Should print "${version}".`);
            break;
            
        case 'pip':
            commands.push('# Install Varkit using pip:');
            commands.push(`pip install varkit==${version}`);
            commands.push('');
            commands.push('# Verify installation:');
            commands.push('varkit --version');
            break;
            
        case 'conda':
            commands.push('# Install Varkit using conda:');
            commands.push(`conda install -c bioconda varkit=${version}`);
            commands.push('');
            commands.push('# Verify installation:');
            commands.push('varkit --version');
            break;
            
        case 'source':
            commands.push('# Clone the repository:');
            commands.push('git clone https://github.com/lakieungocquyet/varkit.git');
            commands.push('cd varkit');
            commands.push('');
            commands.push('# Install from source:');
            commands.push('python setup.py install');
            break;
    }
    
    return commands;
};