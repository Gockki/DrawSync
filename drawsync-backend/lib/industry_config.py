# drawsync-backend/lib/industry_config.py
from __future__ import annotations
import os
import json
from typing import Any, Dict, Tuple

# mtime-cache: (path, mtime, data)
_CACHE: Tuple[str, float, Dict[str, Any]] | None = None

def _candidate_paths():
    env_path = os.getenv("INDUSTRY_CONFIG_PATH", "").strip()
    if env_path:
        yield os.path.abspath(env_path)

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    yield os.path.join(root, "industry_configs.json")
    yield os.path.join(root, "config", "industry_configs.json")

    here = os.path.dirname(__file__)
    yield os.path.join(here, "industry_configs.json")

    cwd = os.getcwd()
    yield os.path.join(cwd, "industry_configs.json")
    yield os.path.join(cwd, "config", "industry_configs.json")

def _first_existing_path() -> str:
    for p in _candidate_paths():
        if os.path.exists(p):
            return p
    raise FileNotFoundError("industry_configs.json not found")

def _load_raw() -> Tuple[str, float, Dict[str, Any]]:
    path = _first_existing_path()
    mtime = os.path.getmtime(path)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("industry_configs.json must be a JSON object")
    return path, mtime, data

def _get_cached() -> Dict[str, Any]:
    global _CACHE
    path, mtime, data = _load_raw()
    if _CACHE and _CACHE[0] == path and _CACHE[1] == mtime:
        return _CACHE[2]
    _CACHE = (path, mtime, data)
    return data

# ---------------- UI-sanitointi (ei vuodateta promptteja) ----------------

def _safe_list(v, default):
    return v if isinstance(v, list) else default

def _safe_dict(v, default):
    return v if isinstance(v, dict) else default

def _block_to_ui(key: str, block: Dict[str, Any]) -> Dict[str, Any]:
    # hyväksy top-level kenttiä
    ui = {
        "id": block.get("id") or key,
        "name": block.get("name") or key.capitalize(),
        "description": block.get("description") or "",
        "icon": block.get("icon") or "",
        "color": block.get("color") or "",
    }

    # sisäinen ui_config-objekti määrittää tabit + features
    uic = _safe_dict(block.get("ui_config"), {})
    ui["tabs"] = _safe_list(uic.get("tabs"), [])
    ui["features"] = _safe_dict(uic.get("features"), {})

    # validointi on hyödyllistä UI:lle (mitä vaaditaan) – tämä EI ole salainen
    validation = _safe_dict(block.get("validation"), {})
    ui["validation"] = {
        "required_fields": _safe_list(validation.get("required_fields"), []),
        "optional_fields": _safe_list(validation.get("optional_fields"), []),
    }

    # Huom: emme palauta block["prompt"]iä (tietoisesti pois)
    return ui

# ---------------- Julkiset funktiot ----------------

def get_industries_ui_config() -> Dict[str, Any]:
    """
    Palauttaa vain UI:lle tarvittavan konfigin kaikille teollisuuksille.
    EI sisällä promptteja.
    """
    cfg = _get_cached()
    out: Dict[str, Any] = {}
    for key, block in cfg.items():
        if isinstance(block, dict):
            out[key] = _block_to_ui(key, block)
    return out

def get_prompt(industry_type: str) -> str:
    """
    Palauttaa valitun teollisuuden promptin backendin käyttöön (/process).
    Heittää KeyError jos ei löydy.
    """
    cfg = _get_cached()
    block = cfg.get(industry_type)
    if not isinstance(block, dict):
        raise KeyError(f"Unknown industry_type '{industry_type}'")
    prompt = (block.get("prompt") or "").strip()
    if not prompt:
        raise KeyError(f"No prompt configured for '{industry_type}'")
    return prompt
