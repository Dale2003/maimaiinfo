#!/usr/bin/env python3
"""Build maimaiinfo static JSON files from the data used by meowmeow."""

from __future__ import annotations

import argparse
import json
import math
from copy import deepcopy
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_ROOT = REPO_ROOT.parent


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, data: Any) -> None:
    temporary_path = path.with_suffix(f"{path.suffix}.tmp")
    with temporary_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=4)
        file.write("\n")
    temporary_path.replace(path)


def normalize_aliases(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []

    aliases: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not isinstance(value, str):
            continue
        alias = value.strip()
        if alias and alias not in seen:
            aliases.append(alias)
            seen.add(alias)
    return aliases


def build_alias_map(main_aliases: Any, local_aliases: Any) -> dict[str, list[str]]:
    if not isinstance(main_aliases, list):
        raise ValueError("music_alias.json must contain an array")
    if not isinstance(local_aliases, dict):
        raise ValueError("local_music_alias.json must contain an object")

    alias_map: dict[str, list[str]] = {}
    for item in main_aliases:
        if not isinstance(item, dict) or "SongID" not in item:
            continue
        song_id = str(item["SongID"])
        alias_map[song_id] = normalize_aliases(item.get("Alias"))

    for raw_song_id, values in local_aliases.items():
        song_id = str(raw_song_id)
        merged = alias_map.setdefault(song_id, [])
        for alias in normalize_aliases(values):
            if alias not in merged:
                merged.append(alias)

    return alias_map


def build_fit_diff(stats: Any, chart_count: int) -> list[float | None]:
    if not isinstance(stats, list):
        return []

    fit_diff: list[float | None] = []
    for chart in stats[:chart_count]:
        value = chart.get("fit_diff") if isinstance(chart, dict) else None
        if isinstance(value, (int, float)) and math.isfinite(value):
            fit_diff.append(round(float(value), 2))
        else:
            fit_diff.append(None)

    while fit_diff and fit_diff[-1] is None:
        fit_diff.pop()
    return fit_diff


def build_all_data(
    music_rows: Any,
    main_aliases: Any,
    local_aliases: Any,
    chart_data: Any,
) -> tuple[dict[str, dict[str, Any]], dict[str, int]]:
    if not isinstance(music_rows, list):
        raise ValueError("more_music_data.json must contain an array")
    if not isinstance(chart_data, dict) or not isinstance(chart_data.get("charts"), dict):
        raise ValueError("music_chart.json must contain a charts object")

    alias_map = build_alias_map(main_aliases, local_aliases)
    charts_by_id = chart_data["charts"]
    all_data: dict[str, dict[str, Any]] = {}
    songs_with_aliases = 0
    songs_with_fit_diff = 0

    for raw_music in music_rows:
        if not isinstance(raw_music, dict) or "id" not in raw_music:
            raise ValueError("Every song must be an object with an id")

        song_id = str(raw_music["id"])
        if song_id in all_data:
            raise ValueError(f"Duplicate song id: {song_id}")

        music = deepcopy(raw_music)
        music["id"] = song_id
        aliases = alias_map.get(song_id, [])
        music["alias"] = aliases
        if aliases:
            songs_with_aliases += 1

        chart_count = len(music.get("ds", [])) if isinstance(music.get("ds"), list) else 0
        fit_diff = build_fit_diff(charts_by_id.get(song_id), chart_count)
        if fit_diff:
            music["fit_diff"] = fit_diff
            songs_with_fit_diff += 1
        else:
            music.pop("fit_diff", None)

        all_data[song_id] = music

    song_ids = set(all_data)
    unknown_alias_ids = set(alias_map) - song_ids
    unknown_chart_ids = set(charts_by_id) - song_ids
    stats = {
        "songs": len(all_data),
        "songs_with_aliases": songs_with_aliases,
        "songs_with_fit_diff": songs_with_fit_diff,
        "unknown_alias_ids": len(unknown_alias_ids),
        "unknown_chart_ids": len(unknown_chart_ids),
    }
    return all_data, stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-root",
        type=Path,
        default=DEFAULT_SOURCE_ROOT,
        help="bot directory containing static/ and meowmeow/",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify generated objects match checked-in JSON without writing",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source_root = args.source_root.resolve()
    output_root = REPO_ROOT / "static"

    music_path = source_root / "meowmeow/plugins/maimaidx_pcinfo/more_music_data.json"
    main_alias_path = source_root / "static/music_alias.json"
    local_alias_path = source_root / "static/local_music_alias.json"
    chart_path = source_root / "static/music_chart.json"
    dschange_path = source_root / "meowmeow/plugins/dschange/dschange.json"
    course_path = source_root / "meowmeow/plugins/course/course.json"

    all_data, stats = build_all_data(
        load_json(music_path),
        load_json(main_alias_path),
        load_json(local_alias_path),
        load_json(chart_path),
    )
    dschange_data = load_json(dschange_path)
    course_data = load_json(course_path)
    if not isinstance(dschange_data, dict):
        raise ValueError("dschange.json must contain an object")
    if not isinstance(course_data, dict):
        raise ValueError("course.json must contain an object")

    outputs = {
        output_root / "all_data.json": all_data,
        output_root / "dschange.json": dschange_data,
        output_root / "course.json": course_data,
    }

    if args.check:
        mismatches = [str(path) for path, data in outputs.items() if load_json(path) != data]
        if mismatches:
            raise SystemExit("Outdated generated data:\n" + "\n".join(mismatches))
        action = "verified"
    else:
        for path, data in outputs.items():
            write_json(path, data)
        action = "wrote"

    print(
        f"{action} {stats['songs']} songs; "
        f"aliases for {stats['songs_with_aliases']}; "
        f"fit_diff for {stats['songs_with_fit_diff']}; "
        f"unknown alias ids {stats['unknown_alias_ids']}; "
        f"unknown chart ids {stats['unknown_chart_ids']}"
    )
    dschange_songs = sum(
        1
        for value in dschange_data.values()
        if isinstance(value, dict) and isinstance(value.get("ds"), list)
    )
    course_count = sum(
        len(courses)
        for versions in course_data.values()
        if isinstance(versions, dict)
        for courses in versions.values()
        if isinstance(courses, dict)
    )
    print(f"{action} {dschange_songs} dschange songs and {course_count} courses")


if __name__ == "__main__":
    main()
