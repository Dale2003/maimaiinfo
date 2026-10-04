"""Merge Japanese chart constants into maimaiinfo's existing history format.

Old snapshots have Easy before Basic; public histories omit Easy. A missing
constant is represented by an absent version key, never by a zero or a visible
level string. This module reads no files and does not import the running bot.
"""

from __future__ import annotations

import math
import re
from collections.abc import Mapping
from typing import Any


OLD_JP_VERSIONS = (
    "maimai", "maimai PLUS", "maimai GreeN", "maimai GreeN PLUS",
    "maimai ORANGE", "maimai ORANGE PLUS", "maimai PiNK", "maimai PiNK PLUS",
    "maimai MURASAKi", "maimai MURASAKi PLUS", "maimai MiLK",
    "maimai MiLK PLUS", "maimai FiNALE",
)
MODERN_JP_VERSIONS = (
    "maimai DX", "maimai DX PLUS", "maimai DX Splash", "maimai DX Splash PLUS",
    "maimai DX UNiVERSE", "maimai DX UNiVERSE PLUS", "maimai DX FESTiVAL",
    "maimai DX FESTiVAL PLUS", "maimai DX BUDDiES", "maimai DX BUDDiES PLUS",
    "maimai DX PRiSM", "maimai DX PRiSM PLUS", "maimai DX CiRCLE",
    "maimai DX CiRCLE PLUS", "maimai でらっくす MAGiCAL",
)
JP_VERSION_ORDER = (*OLD_JP_VERSIONS, *MODERN_JP_VERSIONS)
_VERSION_ALIASES = {
    version.removeprefix("maimai DX "): version
    for version in MODERN_JP_VERSIONS
    if version.startswith("maimai DX ")
}
_VERSION_ALIASES.update({
    "DX": "maimai DX",
    "DX PLUS": "maimai DX PLUS",
    "maimaiでらっくす PLUS": "maimai DX PLUS",
    "MAGiCAL": "maimai でらっくす MAGiCAL",
})


def _object(value: Any, location: str) -> Mapping:
    if not isinstance(value, Mapping):
        raise ValueError(f"{location} must contain an object")
    return value


def _song_id(value: Any, location: str) -> str:
    if type(value) not in (str, int) or not re.fullmatch(r"0|[1-9]\d*", str(value)):
        raise ValueError(f"{location} has an invalid song id: {value!r}")
    return str(value)


def _version(value: Any, location: str) -> str | None:
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError(f"{location} has an invalid version name")
    version = _VERSION_ALIASES.get(value, value)
    if version == "舞萌" or re.fullmatch(r"DX\d{4}", version):
        return None
    if version != "maimai" and not version.startswith("maimai "):
        raise ValueError(f"{location} has an unknown Japanese version: {value!r}")
    return version


def _constant(value: Any, location: str) -> int | float | None:
    if value is None or isinstance(value, str):
        return None
    if type(value) not in (int, float) or not math.isfinite(value) or value < 0:
        raise ValueError(f"{location} must contain a finite nonnegative constant")
    return value if value > 0 else None


def _charts(value: Any, location: str) -> list:
    if not isinstance(value, list) or len(value) > 5:
        raise ValueError(f"{location} must contain at most five chart positions")
    return value


def _name(value: Any, location: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{location} must contain a string")
    return value


def _modern(raw: Any, location: str) -> dict[str, dict[str, Any]]:
    result = {}
    for raw_id, payload in _object(raw, location).items():
        if isinstance(raw_id, str) and raw_id.startswith("__"):
            continue
        song_id = _song_id(raw_id, location)
        if song_id in result:
            raise ValueError(f"{location} repeats song id {song_id}")
        song = _object(payload, f"{location}[{song_id}]")
        if "id" in song and _song_id(song["id"], location) != song_id:
            raise ValueError(f"{location}[{song_id}] has a conflicting id")
        charts = []
        for index, chart in enumerate(_charts(song.get("ds"), f"{location}[{song_id}].ds")):
            normalized = {}
            for raw_version, value in _object(chart, f"{location}[{song_id}].ds[{index}]").items():
                version = _version(raw_version, location)
                constant = _constant(value, location)
                if version is not None and constant is not None:
                    # Prefer an already canonical spelling if aliases collide.
                    if version not in normalized or raw_version == version:
                        normalized[version] = constant
            charts.append(normalized)
        result[song_id] = {
            "name": _name(song.get("name", ""), f"{location}[{song_id}].name"),
            "ds": charts,
        }
    return result


def _apply_increments(raw: Any, songs: dict[str, dict[str, Any]]) -> list[str]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError("dschange.json.__increments__ must contain an array")
    versions = []
    for index, payload in enumerate(raw):
        location = f"dschange.json.__increments__[{index}]"
        increment = _object(payload, location)
        version = _version(increment.get("version"), location)
        if version is None:
            raise ValueError(f"{location}.version must be a Japanese version")
        versions.append(version)
        for raw_id, values in _object(increment.get("songs"), f"{location}.songs").items():
            song_id = _song_id(raw_id, location)
            title = None
            if isinstance(values, Mapping):
                if "name" in values:
                    title = _name(values["name"], f"{location}[{song_id}].name")
                values = values.get("ds")
            values = _charts(values, f"{location}[{song_id}].ds")
            song = songs.setdefault(song_id, {"name": "", "ds": []})
            if title:
                song["name"] = title
            while len(song["ds"]) < len(values):
                song["ds"].append({})
            for chart_index, value in enumerate(values):
                constant = _constant(value, location)
                if constant is not None:
                    song["ds"][chart_index][version] = constant
    return versions


def _old(raw: Any) -> dict[str, dict[str, Any]]:
    result = {}
    for raw_id, payload in _object(raw, "old-merge.json").items():
        song_id = _song_id(raw_id, "old-merge.json")
        if song_id in result:
            raise ValueError(f"old-merge.json repeats song id {song_id}")
        charts = []
        for version, values in _object(payload, f"old-merge.json[{song_id}]").items():
            if version == "舞萌":
                continue
            if version not in OLD_JP_VERSIONS:
                raise ValueError(f"old-merge.json[{song_id}] has an unknown old version")
            if not isinstance(values, list) or not 2 <= len(values) <= 6:
                raise ValueError("old-merge.json arrays must have Easy and at most five charts")
            while len(charts) < len(values) - 1:
                charts.append({})
            for chart_index, value in enumerate(values[1:]):
                constant = _constant(value, f"old-merge.json[{song_id}].{version}")
                if constant is not None:
                    charts[chart_index][version] = constant
        result[song_id] = {"ds": charts}
    return result


def build_dschange_data(
    modern_history: Any,
    old_history: Any,
    fallback_history: Any,
    all_data: Any,
) -> dict[str, dict[str, Any]]:
    """Merge JP histories, preserving chart positions and the public schema.

    Modern data wins over old snapshots where both know a constant. The alias
    library supplies history only for songs missing from the modern source;
    its names may also fill blank titles. Increments are materialized once and
    omitted from the result. Unknown chart values cannot replace valid values.
    Known releases use chronological order, and future releases are retained.
    No input objects are mutated; songs without any numeric history are omitted.
    """
    modern_raw = _object(modern_history, "dschange.json")
    modern = _modern(modern_raw, "dschange.json")
    increment_versions = _apply_increments(modern_raw.get("__increments__"), modern)
    fallback = _modern(fallback_history, "new_alias_lib.json")
    old = _old(old_history)
    all_data = _object(all_data, "all_data.json")

    songs = {}
    observed = dict.fromkeys(increment_versions)
    for song_id in sorted(set(modern) | set(fallback) | set(old), key=int):
        modern_song = modern.get(song_id, fallback.get(song_id, {"name": "", "ds": []}))
        old_charts = old.get(song_id, {"ds": []})["ds"]
        modern_charts = modern_song["ds"]
        charts = []
        for index in range(max(len(old_charts), len(modern_charts))):
            chart = dict(old_charts[index]) if index < len(old_charts) else {}
            if index < len(modern_charts):
                chart.update(modern_charts[index])
            observed.update(dict.fromkeys(chart))
            charts.append(chart)
        if not any(charts):
            continue
        music = all_data.get(song_id, {})
        title = modern_song["name"]
        if not title and isinstance(music, Mapping):
            title = music.get("title", "")
        if not title:
            title = fallback.get(song_id, {}).get("name", "")
        songs[song_id] = {"id": song_id, "name": title, "ds": charts}

    version_order = [version for version in JP_VERSION_ORDER if version in observed]
    version_order.extend(version for version in observed if version not in JP_VERSION_ORDER)
    for song in songs.values():
        song["ds"] = [
            {version: chart[version] for version in version_order if version in chart}
            for chart in song["ds"]
        ]
    return songs


__all__ = ["build_dschange_data", "JP_VERSION_ORDER"]
