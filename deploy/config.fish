# Fish shell configuration

# PATH
fish_add_path -g ~/.local/bin
fish_add_path -g /usr/local/bin
fish_add_path -g /usr/bin

# Auto-set DISPLAY for VNC
set -gx DISPLAY :1

# Aliases
alias ll "ls -la"
alias la "ls -A"
alias l "ls -CF"
alias gs "git status"
alias gd "git diff"
alias gco "git checkout"
alias dc "docker compose"
alias dps "docker ps"
alias dlogs "docker logs -f"

# CopaMundial shortcuts
alias copa-logs "docker logs -f copa-app"
alias copa-restart "cd /opt/copamundial/deploy; docker compose -f docker-compose.copa.yml up -d"
alias copa-edit "nano /opt/copamundial/deploy/.env"
alias copa-status "docker ps --filter name=copa-app"

# Greeting
function fish_greeting
    echo ""
    echo "  Welcome to Oracle A1 Flex"
    echo "  Shell: fish"
    echo ""
    echo "  Running services:"
    docker ps --format "    {{.Names}}  ({{.Status}})" 2>/dev/null
    echo ""
end
