#!/bin/bash

# 🎯 MANAGE DEMOS - List, stop, start, or remove demo pages

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVER="deployer@178.156.182.177"

show_help() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🎯 SmartKubik Demo Management${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Usage: ./manage-demos.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo -e "  ${GREEN}list${NC}                  - List all deployed demos"
    echo -e "  ${YELLOW}stop${NC} <subdomain>       - Stop a demo (keep files)"
    echo -e "  ${GREEN}start${NC} <subdomain>      - Start a stopped demo"
    echo -e "  ${YELLOW}restart${NC} <subdomain>   - Restart a demo"
    echo -e "  ${RED}remove${NC} <subdomain>     - Completely remove a demo"
    echo -e "  ${CYAN}logs${NC} <subdomain>       - View PM2 logs for a demo"
    echo -e "  ${BLUE}status${NC}                 - Show PM2 status of all demos"
    echo ""
    echo "Examples:"
    echo "  ./manage-demos.sh list"
    echo "  ./manage-demos.sh stop restaurante-casa-pepe"
    echo "  ./manage-demos.sh remove cafeteria-dulce-aroma"
    echo "  ./manage-demos.sh logs restaurante-casa-pepe"
    echo ""
}

list_demos() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 Deployed Demo Pages${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Get PM2 processes that start with "demo-"
    echo -e "${YELLOW}🔍 Scanning PM2 processes...${NC}"
    DEMO_PROCESSES=$(ssh $SERVER "pm2 jlist | jq -r '.[] | select(.name | startswith(\"demo-\")) | .name'")

    if [ -z "$DEMO_PROCESSES" ]; then
        echo -e "${YELLOW}No demo pages found${NC}"
        echo ""
        return
    fi

    echo ""
    printf "%-30s %-10s %-15s %-40s\n" "SUBDOMAIN" "STATUS" "PORT" "URL"
    echo "────────────────────────────────────────────────────────────────────────────────────────────────────"

    while IFS= read -r pm2_name; do
        # Extract subdomain from pm2 name (demo-restaurante-casa-pepe -> restaurante-casa-pepe)
        SUBDOMAIN="${pm2_name#demo-}"

        # Get PM2 process info
        PM2_INFO=$(ssh $SERVER "pm2 jlist | jq -r '.[] | select(.name == \"$pm2_name\") | @json'")

        STATUS=$(echo "$PM2_INFO" | jq -r '.pm2_env.status')
        PORT=$(echo "$PM2_INFO" | jq -r '.pm2_env.PORT // "N/A"')

        # Color status
        if [[ "$STATUS" == "online" ]]; then
            STATUS_COLOR="${GREEN}online${NC}"
        elif [[ "$STATUS" == "stopped" ]]; then
            STATUS_COLOR="${RED}stopped${NC}"
        else
            STATUS_COLOR="${YELLOW}$STATUS${NC}"
        fi

        URL="https://${SUBDOMAIN}.smartkubik.com"

        printf "%-30s " "$SUBDOMAIN"
        echo -ne "$STATUS_COLOR"
        printf " %-15s " "     "
        printf "%-15s " "$PORT"
        printf "%-40s\n" "$URL"

    done <<< "$DEMO_PROCESSES"

    echo ""
}

stop_demo() {
    local SUBDOMAIN=$1
    local PM2_NAME="demo-${SUBDOMAIN}"

    echo -e "${YELLOW}🛑 Stopping demo: ${SUBDOMAIN}${NC}"

    # Check if exists
    EXISTS=$(ssh $SERVER "pm2 list | grep $PM2_NAME || echo 'NOT_FOUND'")

    if [[ "$EXISTS" == "NOT_FOUND" ]]; then
        echo -e "${RED}❌ Demo not found: $PM2_NAME${NC}"
        exit 1
    fi

    ssh $SERVER "pm2 stop $PM2_NAME"
    ssh $SERVER "pm2 save"

    echo -e "${GREEN}✅ Demo stopped (files preserved)${NC}"
}

start_demo() {
    local SUBDOMAIN=$1
    local PM2_NAME="demo-${SUBDOMAIN}"

    echo -e "${GREEN}▶️  Starting demo: ${SUBDOMAIN}${NC}"

    # Check if exists
    EXISTS=$(ssh $SERVER "pm2 list | grep $PM2_NAME || echo 'NOT_FOUND'")

    if [[ "$EXISTS" == "NOT_FOUND" ]]; then
        echo -e "${RED}❌ Demo not found: $PM2_NAME${NC}"
        echo -e "${YELLOW}Use ./deploy-demo-page.sh to deploy a new demo${NC}"
        exit 1
    fi

    ssh $SERVER "pm2 start $PM2_NAME"
    ssh $SERVER "pm2 save"

    echo -e "${GREEN}✅ Demo started${NC}"
}

restart_demo() {
    local SUBDOMAIN=$1
    local PM2_NAME="demo-${SUBDOMAIN}"

    echo -e "${YELLOW}♻️  Restarting demo: ${SUBDOMAIN}${NC}"

    ssh $SERVER "pm2 restart $PM2_NAME"

    echo -e "${GREEN}✅ Demo restarted${NC}"
}

remove_demo() {
    local SUBDOMAIN=$1
    local PM2_NAME="demo-${SUBDOMAIN}"

    echo -e "${RED}🗑️  Removing demo: ${SUBDOMAIN}${NC}"
    echo -e "${YELLOW}This will:${NC}"
    echo "  - Stop and delete PM2 process"
    echo "  - Remove files from ~/smartkubik/demos/${SUBDOMAIN}"
    echo "  - Disable nginx configuration"
    echo ""
    read -p "$(echo -e ${YELLOW}Are you sure? [y/N]: ${NC})" -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cancelled${NC}"
        exit 0
    fi

    # Stop and delete PM2 process
    echo -e "${YELLOW}Stopping PM2 process...${NC}"
    ssh $SERVER "pm2 delete $PM2_NAME 2>/dev/null || true"
    ssh $SERVER "pm2 save"

    # Remove files
    echo -e "${YELLOW}Removing files...${NC}"
    ssh $SERVER "rm -rf ~/smartkubik/demos/${SUBDOMAIN}"

    # Disable nginx
    echo -e "${YELLOW}Disabling nginx config...${NC}"
    ssh $SERVER "sudo rm -f /etc/nginx/sites-enabled/${SUBDOMAIN}.conf"
    ssh $SERVER "sudo rm -f /etc/nginx/sites-available/${SUBDOMAIN}.conf"
    ssh $SERVER "sudo nginx -t && sudo systemctl reload nginx"

    echo -e "${GREEN}✅ Demo removed completely${NC}"
}

show_logs() {
    local SUBDOMAIN=$1
    local PM2_NAME="demo-${SUBDOMAIN}"

    echo -e "${CYAN}📄 Showing logs for: ${SUBDOMAIN}${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
    echo ""

    ssh -t $SERVER "pm2 logs $PM2_NAME"
}

show_status() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 PM2 Status (All Demos)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    ssh $SERVER "pm2 list | grep -E 'demo-|name'"
}

# Main
COMMAND=$1

if [ -z "$COMMAND" ]; then
    show_help
    exit 0
fi

case $COMMAND in
    list)
        list_demos
        ;;
    stop)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Missing subdomain${NC}"
            echo "Usage: ./manage-demos.sh stop <subdomain>"
            exit 1
        fi
        stop_demo "$2"
        ;;
    start)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Missing subdomain${NC}"
            echo "Usage: ./manage-demos.sh start <subdomain>"
            exit 1
        fi
        start_demo "$2"
        ;;
    restart)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Missing subdomain${NC}"
            echo "Usage: ./manage-demos.sh restart <subdomain>"
            exit 1
        fi
        restart_demo "$2"
        ;;
    remove)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Missing subdomain${NC}"
            echo "Usage: ./manage-demos.sh remove <subdomain>"
            exit 1
        fi
        remove_demo "$2"
        ;;
    logs)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Missing subdomain${NC}"
            echo "Usage: ./manage-demos.sh logs <subdomain>"
            exit 1
        fi
        show_logs "$2"
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
