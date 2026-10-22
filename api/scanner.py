import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit

from gdpr_analyzer import (
    assess_rank,
    full,
    get_content,
)


def normalize_target(value: str) -> str:
    """Normalize a website URL and reject obvious private-network targets."""

    value = value.strip()

    if not value:
        raise ValueError("A website URL is required.")

    if "://" not in value:
        value = "https://" + value

    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        port = parsed.port
    except ValueError as exc:
        raise ValueError("Invalid website URL.") from exc

    if parsed.scheme.lower() not in {"http", "https"}:
        raise ValueError("Only HTTP and HTTPS URLs are supported.")

    if not hostname or parsed.username or parsed.password:
        raise ValueError("Provide a valid public website URL.")

    if port is not None and port not in {80, 443}:
        raise ValueError("Only standard HTTP/HTTPS ports are supported.")

    hostname = hostname.rstrip(".").lower()

    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("Local websites cannot be scanned through this API.")

    try:
        addresses = {
            ipaddress.ip_address(info[4][0].split("%")[0])
            for info in socket.getaddrinfo(
                hostname,
                port or (443 if parsed.scheme == "https" else 80),
                type=socket.SOCK_STREAM,
            )
        }
    except (OSError, ValueError) as exc:
        raise ValueError(
            "The website hostname could not be resolved."
        ) from exc

    if not addresses or any(not address.is_global for address in addresses):
        raise ValueError(
            "The target must resolve exclusively to public IP addresses."
        )

    return urlunsplit(
        (
            parsed.scheme.lower(),
            parsed.netloc,
            parsed.path or "/",
            parsed.query,
            "",
        )
    )


def run_scan(target_url: str) -> dict:
    """
    Run all existing analyzer modules and return their combined JSON data.
    """

    target_url = normalize_target(target_url)
    parsed = urlsplit(target_url)

    cookies, html = get_content(target_url)

    result = full(
        cookies,
        html,
        parsed.netloc,
    )

    result["target"] = parsed.netloc
    result["grade"] = assess_rank(result)

    return result