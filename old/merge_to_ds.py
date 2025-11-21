import json

id_to_ver = {
    '13': 'maimai DX',
    '14': 'maimai DX PLUS',
    '15': 'maimai DX Splash',
    '16': 'maimai DX Splash PLUS',
    '17': 'maimai DX UNiVERSE',
    '18': 'maimai DX UNiVERSE PLUS',
    '19': 'maimai DX FESTiVAL',
    '20': 'maimai DX FESTiVAL PLUS',
    '21': 'maimai DX BUDDiES',
    '22': 'maimai DX BUDDiES PLUS',
    '23': 'maimai DX PRiSM',
    '24': 'maimai DX PRiSM PLUS',
    '25': 'maimai DX CiRCLE'
}

with open('/Users/dale/Documents/maimaiinfo/old/merged1122.json') as f:
    data = json.load(f)

new_data = {}

for song_id in data["music"]:
    if song_id in ["854"]:
        continue
    new_data[song_id] = {}
    new_data[song_id]["name"] = data["music"][song_id]["name"]
    new_data[song_id]["id"] = song_id
    new_data[song_id]["ds"] = []
    for level in data["music"][song_id]["levelChangeLog"]:
        version_dict = {}
        ds = None
        for ver_id in id_to_ver:
            version_dict[id_to_ver[ver_id]] = None
            if ds is not None:
                version_dict[id_to_ver[ver_id]] = ds
            if ver_id in level:
                # print(song_id, ver_id, level[ver_id])
                version_dict[id_to_ver[ver_id]] = level[ver_id]
                ds = level[ver_id]
            try:
                if ver_id in data["music"][song_id]["regionalInfo"]["JPN"]["addDeleteLog"]:
                    if data["music"][song_id]["regionalInfo"]["JPN"]["addDeleteLog"][ver_id] in [3, 4]:
                        version_dict[id_to_ver[ver_id]] = None
                        ds = None
                        # print(song_id, ver_id, data["music"][song_id]["regionOverrides"]["JPN"]["addDeleteLog"][ver_id])
            except KeyError:
                print(song_id, ver_id, "KeyError")
            # 去除值为null的键值对
        version_dict = {k: v for k, v in version_dict.items() if v is not None}
        new_data[song_id]["ds"].append(version_dict)

with open('/Users/dale/Documents/maimaiinfo/old/merged_ds_1122.json', 'w') as f:
    json.dump(new_data, f, indent=4, ensure_ascii=False)
    print("merged_ds_1122.json saved")
