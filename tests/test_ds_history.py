"""Check the public history merge without loading the bot or local data files."""

import unittest
from copy import deepcopy

from scripts.ds_history import JP_VERSION_ORDER, build_dschange_data


class DsHistoryTests(unittest.TestCase):
    def build(self, modern=None, old=None, fallback=None, all_data=None):
        return build_dschange_data(modern or {}, old or {}, fallback or {}, all_data or {})

    def test_old_easy_is_removed_without_shifting_other_charts(self):
        old = {"8": {"maimai": [1, 4, 6, 8, 10, 0], "舞萌": [2, 9, 9, 9, 9, 9]}}
        result = self.build(old=old, all_data={"8": {"title": "True Love Song"}})
        self.assertEqual(result["8"], {
            "id": "8", "name": "True Love Song",
            "ds": [{"maimai": 4}, {"maimai": 6}, {"maimai": 8}, {"maimai": 10}, {}],
        })

    def test_missing_old_and_modern_values_do_not_become_constants(self):
        old = {"8": {"maimai FiNALE": [2, 4, 0, "13+", None, 0]}}
        modern = {"8": {"name": "Song", "ds": [
            {"maimai FiNALE": 0, "maimai DX": "4", "maimai DX PLUS": None},
            {"maimai DX": 7}, {}, {}, {},
        ]}}
        result = self.build(modern=modern, old=old)["8"]["ds"]
        self.assertEqual(result, [{"maimai FiNALE": 4}, {"maimai DX": 7}, {}, {}, {}])

    def test_old_song_absent_from_modern_gets_title_and_fallback_history(self):
        result = self.build(
            old={"10": {"maimai": [1, 4, 6, 8, 10, 0]}},
            fallback={"10": {"name": "LOVE & JOY", "ds": [{"Splash": 4.5}]}},
        )
        self.assertEqual(result["10"]["name"], "LOVE & JOY")
        self.assertEqual(result["10"]["ds"][0], {"maimai": 4, "maimai DX Splash": 4.5})

    def test_modern_wins_per_song_and_valid_value(self):
        result = self.build(
            modern={"8": {"name": "Current", "ds": [{"maimai FiNALE": 4.5}]}},
            old={"8": {"maimai FiNALE": [1, 4, 6, 8, 10]}},
            fallback={"8": {"name": "Fallback", "ds": [{"Splash": 8}]}},
        )["8"]
        self.assertEqual(result["name"], "Current")
        self.assertEqual(result["ds"][0], {"maimai FiNALE": 4.5})
        self.assertEqual(result["ds"][1], {"maimai FiNALE": 6})

    def test_increments_add_songs_and_versions_without_erasing_known_values(self):
        modern = {
            "8": {"name": "Song", "ds": [{"maimai DX NEXT": 5}, {}]},
            "__increments__": [
                {"version": "maimai DX NEXT", "cn_version": "DX2027", "songs": {"8": [0, 7]}},
                {"version": "maimai DX NEXT PLUS", "songs": {
                    "8": [5.5, "7+"], "99": {"name": "New Song", "ds": [4, 6, 9, 13.4]},
                }},
            ],
        }
        result = self.build(modern=modern)
        self.assertEqual(result["8"]["ds"], [
            {"maimai DX NEXT": 5, "maimai DX NEXT PLUS": 5.5}, {"maimai DX NEXT": 7},
        ])
        self.assertEqual(result["99"]["name"], "New Song")
        self.assertEqual(result["99"]["ds"][3], {"maimai DX NEXT PLUS": 13.4})
        self.assertNotIn("__increments__", result)
        self.assertNotIn("DX2027", result["8"]["ds"][0])

    def test_fallback_shorthand_versions_are_canonical_and_ordered(self):
        result = self.build(fallback={"8": {"name": "Song", "ds": [{
            "PRiSM": 5.3, "maimaiでらっくす PLUS": 4, "Splash PLUS": 4.1,
            "MAGiCAL": 5.4, "FESTiVAL": 4.8,
        }]}})["8"]["ds"][0]
        self.assertEqual(list(result), [
            "maimai DX PLUS", "maimai DX Splash PLUS", "maimai DX FESTiVAL",
            "maimai DX PRiSM", "maimai でらっくす MAGiCAL",
        ])
        self.assertEqual(len(JP_VERSION_ORDER), 28)

    def test_magical_is_taken_from_modern_without_extending_absent_charts(self):
        result = self.build(modern={"8": {"name": "Song", "ds": [
            {"maimai でらっくす MAGiCAL": 5.1, "maimai DX CiRCLE PLUS": 5}, {},
        ]}})["8"]["ds"]
        self.assertEqual(result, [
            {"maimai DX CiRCLE PLUS": 5, "maimai でらっくす MAGiCAL": 5.1}, {},
        ])

    def test_blank_modern_name_uses_all_data_then_fallback(self):
        result = self.build(
            modern={"8": {"ds": [{"maimai DX": 4}]}, "9": {"ds": [{"maimai DX": 4}]}},
            fallback={"8": {"name": "Fallback 8", "ds": []}, "9": {"name": "Fallback 9", "ds": []}},
            all_data={"8": {"title": "Library 8"}},
        )
        self.assertEqual(result["8"]["name"], "Library 8")
        self.assertEqual(result["9"]["name"], "Fallback 9")

    def test_inputs_are_not_mutated_and_result_has_no_alias_metadata(self):
        args = [
            {"8": {"name": "Song", "ds": [{"maimai DX": 4}]},
             "__increments__": [{"version": "maimai DX NEXT", "songs": {"8": [5]}}]},
            {"8": {"maimai": [1, 4, 6, 8, 10, 0]}},
            {"8": {"name": "Fallback", "alias": ["alias"], "ds": [{"Splash": 6}]}},
            {"8": {"title": "Library"}},
        ]
        before = deepcopy(args)
        result = build_dschange_data(*args)
        self.assertEqual(args, before)
        self.assertEqual(set(result["8"]), {"id", "name", "ds"})
        result["8"]["ds"][0]["maimai DX"] = 99
        self.assertEqual(args, before)

    def test_songs_with_only_missing_values_are_omitted(self):
        self.assertEqual(self.build(fallback={"0": {"name": "Placeholder", "ds": [{}, {}]}}), {})

    def test_materialized_history_can_be_rebuilt_without_metadata_or_value_changes(self):
        modern = {
            "8": {"name": "Song", "ds": [{"maimai DX": 4, "maimai DX NEXT": 4.5}]},
            "__increments__": [{"version": "maimai DX NEXT", "songs": {"8": [5]}}],
        }
        old = {"8": {"maimai": [1, 4, 6, 8, 10, 0]}}
        result = self.build(modern=modern, old=old)
        self.assertEqual(result["8"]["ds"][0]["maimai DX NEXT"], 5)
        self.assertEqual(self.build(modern=result, old=old), result)

    def test_only_chinese_old_history_does_not_create_a_japanese_song(self):
        result = self.build(old={"902": {"舞萌": [2, 4, 6, 8, 10, 0]}})
        self.assertEqual(result, {})

    def test_invalid_chart_count_fails_with_source_name(self):
        with self.assertRaisesRegex(ValueError, "old-merge.json"):
            self.build(old={"8": {"maimai": [1, 2, 3, 4, 5, 6, 7]}})


if __name__ == "__main__":
    unittest.main()
