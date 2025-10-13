import json
with open('static/more_music_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# with open('static/all_alias.json', 'r', encoding='utf-8') as f:
#     alias = json.load(f)

with open('static/music_chart.json', 'r', encoding='utf-8') as f:
    chart = json.load(f)

with open('static/music_alias.json', 'r', encoding='utf-8') as f:
    raw_alias = json.load(f)

alias = {}
for music in raw_alias:
    alias[music["SongID"]] = music["Alias"]

with open('static/all_alias.json', 'w', encoding='utf-8') as f:
    json.dump(alias, f, ensure_ascii=False, indent=4)

new_data = {}

for music in data:
    if music["id"] not in new_data:
        new_data[music["id"]] = music

for id in alias:
    if str(id) in new_data:
        new_data[str(id)]["alias"] = alias[id]
    else:
        print(f"ID {id} not found in music data.")

for id in chart["charts"]:
    if str(id) not in new_data:
        print(f"ID {id} not found in music data.")
        continue
    new_data[str(id)]["fit_diff"] = []
    for c in chart["charts"][id]:
        # print(c)
        try:
            new_data[str(id)]["fit_diff"].append(round(c['fit_diff'], 2))
        except KeyError:
            pass

with open('static/all_data_new.json', 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, indent=4)