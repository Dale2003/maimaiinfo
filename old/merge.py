import json
with open('static/music_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('static/all_alias.json', 'r', encoding='utf-8') as f:
    alias = json.load(f)

with open('static/music_chart.json', 'r', encoding='utf-8') as f:
    chart = json.load(f)

new_data = {}

for music in data:
    if music["id"] not in new_data:
        new_data[music["id"]] = music

for id in alias:
    if id in new_data:
        new_data[id]["alias"] = alias[id]
    else:
        print(f"ID {id} not found in music data.")

for id in chart["charts"]:
    new_data[id]["fit_diff"] = []
    for c in chart["charts"][id]:
        # print(c)
        try:
            new_data[id]["fit_diff"].append(round(c['fit_diff'], 2))
        except KeyError:
            pass

with open('static/all_data.json', 'w', encoding='utf-8') as f:
    json.dump(new_data, f)