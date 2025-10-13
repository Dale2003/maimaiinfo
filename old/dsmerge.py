import json

with open("static/dschange.json", "r", encoding="utf-8") as f:
    dschange = json.load(f)

with open('static/160ds.json', 'r', encoding='utf-8') as f:
    ds160 = json.load(f)

with open('static/all_data_new.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for musicid in ds160:
    if str(musicid) in dschange:
        for lvidx, lv in enumerate(ds160[musicid]['ds']):
            if lvidx <= len(dschange[musicid]["ds"]):
                dschange[musicid]["ds"][lvidx]['maimai DX CiRCLE'] = lv
            else:
                dschange[musicid]["ds"].append({'maimai DX CiRCLE': lv})
    else:
        if "CiRCLE" not in data[str(musicid)]["basic_info"]["from"]:
            dschange[musicid] = {
            'id': musicid,
            'name': ds160[musicid]['name'],
            'ds': [{'maimai DX PRiSM PLUS': lv,
                    'maimai DX CiRCLE': lv} for lv in ds160[musicid]['ds']]
            }
        else:
            dschange[musicid] = {
            'id': musicid,
            'name': ds160[musicid]['name'],
            'ds': [{'maimai DX CiRCLE': lv} for lv in ds160[musicid]['ds']]}
with open('static/dschange_new.json', 'w', encoding='utf-8') as f:
    json.dump(dschange, f, ensure_ascii=False, indent=4)