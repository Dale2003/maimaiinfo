import json

with open("/Users/dale/Documents/maimaiinfo/old/static/dschange_160updated_0214.json", "r", encoding="utf-8") as f:
    dschange = json.load(f)

with open('/Users/dale/Documents/maimaicode/165hdd.json', 'r', encoding='utf-8') as f:
    ds160 = json.load(f)

ds160 = {item['id']: item for item in ds160}

with open('/Users/dale/Documents/maimaicode/165hdd.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

data = {item['id']: item for item in data}

for musicid in ds160:
    if str(musicid) in dschange:
        for lvidx, lv in enumerate(ds160[musicid]['ds']):
            if lvidx < len(dschange[musicid]["ds"]):
                # if "CiRCLE PLUS" in data[str(musicid)]["basic_info"]["from"]:
                dschange[musicid]["ds"][lvidx]['maimai DX CiRCLE PLUS'] = float(lv)
            else:
                dschange[musicid]["ds"].append({'maimai DX CiRCLE PLUS': lv})
    else:
        print(str(musicid) + " not in dschange")
        if "CiRCLE" in data[str(musicid)]["basic_info"]["from"] and "CiRCLE PLUS" not in data[str(musicid)]["basic_info"]["from"]:
            dschange[musicid] = {
            'id': musicid,
            'name': ds160[musicid]['title'],
            'ds': [{'maimai DX CiRCLE': lv,
                    'maimai DX CiRCLE PLUS': lv} for lv in ds160[musicid]['ds']]
            }
        elif "CiRCLE PLUS" in data[str(musicid)]["basic_info"]["from"]:
            dschange[musicid] = {
            'id': musicid,
            'name': ds160[musicid]['title'],
            'ds': [{'maimai DX CiRCLE PLUS': lv} for lv in ds160[musicid]['ds']]}
# 按int排序
dschange = dict(sorted(dschange.items(), key=lambda item: int(item[0])))
with open('static/dschange_165updated.json', 'w', encoding='utf-8') as f:
    json.dump(dschange, f, ensure_ascii=False, indent=4)