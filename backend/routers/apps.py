"""
ServerDash — App Store router.
Provides a curated catalog of self-hosted apps and install endpoints.
"""

import json
from fastapi import APIRouter, Depends
from auth import require_jwt
from database import get_db
from models import InstallAppRequest

router = APIRouter(prefix="/api", tags=["apps"])


# ── Curated App Catalog ───────────────────────────────────

APP_CATALOG = [
    # Web Servers
    {
        "id": "nginx",
        "name": "Nginx",
        "description": "High-performance web server and reverse proxy",
        "category": "Web Servers",
        "icon": "🌐",
        "method": "docker",
        "image": "nginx:alpine",
        "ports": {"80/tcp": 8080},
        "color": "#009639",
    },
    {
        "id": "caddy",
        "name": "Caddy",
        "description": "Modern web server with automatic HTTPS",
        "category": "Web Servers",
        "icon": "🔒",
        "method": "docker",
        "image": "caddy:latest",
        "ports": {"80/tcp": 8081, "443/tcp": 8443},
        "color": "#1f88e5",
    },
    # Databases
    {
        "id": "postgres",
        "name": "PostgreSQL",
        "description": "Advanced open-source relational database",
        "category": "Databases",
        "icon": "🐘",
        "method": "docker",
        "image": "postgres:16-alpine",
        "ports": {"5432/tcp": 5432},
        "env": {"POSTGRES_PASSWORD": "changeme"},
        "volumes": ["pgdata:/var/lib/postgresql/data"],
        "color": "#336791",
    },
    {
        "id": "mysql",
        "name": "MySQL",
        "description": "Popular open-source relational database",
        "category": "Databases",
        "icon": "🐬",
        "method": "docker",
        "image": "mysql:8",
        "ports": {"3306/tcp": 3306},
        "env": {"MYSQL_ROOT_PASSWORD": "changeme"},
        "volumes": ["mysqldata:/var/lib/mysql"],
        "color": "#4479A1",
    },
    {
        "id": "redis",
        "name": "Redis",
        "description": "In-memory data store for caching and messaging",
        "category": "Databases",
        "icon": "⚡",
        "method": "docker",
        "image": "redis:alpine",
        "ports": {"6379/tcp": 6379},
        "color": "#DC382D",
    },
    {
        "id": "mongodb",
        "name": "MongoDB",
        "description": "NoSQL document database for modern apps",
        "category": "Databases",
        "icon": "🍃",
        "method": "docker",
        "image": "mongo:7",
        "ports": {"27017/tcp": 27017},
        "volumes": ["mongodata:/data/db"],
        "color": "#47A248",
    },
    # Management
    {
        "id": "portainer",
        "name": "Portainer",
        "description": "Docker management UI with visual container control",
        "category": "Management",
        "icon": "🐳",
        "method": "docker",
        "image": "portainer/portainer-ce",
        "ports": {"9000/tcp": 9000},
        "volumes": ["/var/run/docker.sock:/var/run/docker.sock", "portainer_data:/data"],
        "color": "#13bef9",
    },
    # Networking
    {
        "id": "pihole",
        "name": "Pi-hole",
        "description": "Network-wide ad blocker and DNS sinkhole",
        "category": "Networking",
        "icon": "🛡️",
        "method": "docker",
        "image": "pihole/pihole",
        "ports": {"53/tcp": 53, "53/udp": 53, "80/tcp": 8053},
        "env": {"WEBPASSWORD": "changeme"},
        "color": "#96060c",
    },
    # Monitoring
    {
        "id": "grafana",
        "name": "Grafana",
        "description": "Analytics and monitoring dashboard platform",
        "category": "Monitoring",
        "icon": "📊",
        "method": "docker",
        "image": "grafana/grafana",
        "ports": {"3000/tcp": 3000},
        "volumes": ["grafana_data:/var/lib/grafana"],
        "color": "#F46800",
    },
    {
        "id": "prometheus",
        "name": "Prometheus",
        "description": "Time-series monitoring and alerting toolkit",
        "category": "Monitoring",
        "icon": "🔥",
        "method": "docker",
        "image": "prom/prometheus",
        "ports": {"9090/tcp": 9090},
        "color": "#E6522C",
    },
    {
        "id": "uptime-kuma",
        "name": "Uptime Kuma",
        "description": "Self-hosted uptime monitoring tool",
        "category": "Monitoring",
        "icon": "📡",
        "method": "docker",
        "image": "louislam/uptime-kuma",
        "ports": {"3001/tcp": 3001},
        "volumes": ["uptimekuma:/app/data"],
        "color": "#5CDD8B",
    },
    # Media
    {
        "id": "jellyfin",
        "name": "Jellyfin",
        "description": "Free media streaming server for movies and TV",
        "category": "Media",
        "icon": "🎬",
        "method": "docker",
        "image": "jellyfin/jellyfin",
        "ports": {"8096/tcp": 8096},
        "volumes": ["jellyfin_config:/config", "jellyfin_cache:/cache"],
        "color": "#00A4DC",
    },
    # Storage
    {
        "id": "nextcloud",
        "name": "Nextcloud",
        "description": "Self-hosted cloud storage and collaboration",
        "category": "Storage",
        "icon": "☁️",
        "method": "docker",
        "image": "nextcloud:latest",
        "ports": {"80/tcp": 8082},
        "volumes": ["nextcloud_data:/var/www/html"],
        "color": "#0082c9",
    },
    # CMS
    {
        "id": "wordpress",
        "name": "WordPress",
        "description": "Popular content management system",
        "category": "CMS",
        "icon": "📝",
        "method": "docker",
        "image": "wordpress:latest",
        "ports": {"80/tcp": 8083},
        "color": "#21759B",
    },
    # DevOps
    {
        "id": "gitlab",
        "name": "GitLab CE",
        "description": "Complete DevOps platform with Git hosting",
        "category": "DevOps",
        "icon": "🦊",
        "method": "docker",
        "image": "gitlab/gitlab-ce",
        "ports": {"80/tcp": 8084, "443/tcp": 8444, "22/tcp": 2222},
        "volumes": ["gitlab_config:/etc/gitlab", "gitlab_data:/var/opt/gitlab", "gitlab_logs:/var/log/gitlab"],
        "color": "#FC6D26",
    },
    # IoT
    {
        "id": "homeassistant",
        "name": "Home Assistant",
        "description": "Open-source home automation platform",
        "category": "IoT",
        "icon": "🏠",
        "method": "docker",
        "image": "homeassistant/home-assistant",
        "ports": {"8123/tcp": 8123},
        "volumes": ["ha_config:/config"],
        "color": "#41BDF5",
    },
]

CATEGORIES = sorted(set(a["category"] for a in APP_CATALOG))


@router.get("/apps/catalog")
async def get_catalog(_user: str = Depends(require_jwt)):
    """Return the curated app catalog."""
    return {
        "apps": APP_CATALOG,
        "categories": CATEGORIES,
    }


@router.post("/apps/{server_id}/install")
async def install_app(
    server_id: str,
    req: InstallAppRequest,
    _user: str = Depends(require_jwt),
):
    """Install an app from the catalog via docker or apt."""
    if req.method == "docker":
        # Find the app in catalog for defaults
        catalog_app = next((a for a in APP_CATALOG if a["id"] == req.package_name), None)

        image = req.image or (catalog_app["image"] if catalog_app else req.package_name)
        ports = req.ports or (catalog_app.get("ports") if catalog_app else None)
        env = req.env or (catalog_app.get("env") if catalog_app else None)
        volumes = req.volumes or (catalog_app.get("volumes") if catalog_app else None)

        payload = json.dumps({
            "image": image,
            "name": req.package_name,
            "ports": ports,
            "env": env,
            "volumes": volumes,
            "restart_policy": "unless-stopped",
        })

        async with get_db() as db:
            cursor = await db.execute(
                """INSERT INTO pending_commands (server_id, command_type, payload)
                   VALUES (?, 'docker_deploy', ?)""",
                (server_id, payload),
            )
            command_id = cursor.lastrowid
            await db.commit()

        return {"status": "queued", "command_id": command_id, "method": "docker"}

    elif req.method == "apt":
        payload = json.dumps({"package": req.package_name})

        async with get_db() as db:
            cursor = await db.execute(
                """INSERT INTO pending_commands (server_id, command_type, payload)
                   VALUES (?, 'apt_install', ?)""",
                (server_id, payload),
            )
            command_id = cursor.lastrowid
            await db.commit()

        return {"status": "queued", "command_id": command_id, "method": "apt"}

    from fastapi import HTTPException
    raise HTTPException(400, "Invalid method. Use 'docker' or 'apt'.")
