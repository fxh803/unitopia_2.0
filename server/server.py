from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime
import math
import base64
from unitopia import Unitopia 
app = Flask(__name__, template_folder='',static_folder="")
CORS(app)  # 启用跨域支持
unitopia = Unitopia() 
@app.route('/api/process-data', methods=['POST'])
def process_data():  
    
    # 获取请求数据
    request_data = request.get_json() 
    data = request_data['data']
    id = request_data['id']
    canvas_width = request_data['canvasWidth']
    canvas_height = request_data['canvasHeight']
    print(data)
    json_data = {
        "collage": []
    }
    for i, collage_data in enumerate(data):#这是要输入的数据
        #文件夹准备
        os.makedirs(f"./workdir/{str(id)}_{i}", exist_ok=True) 
        os.makedirs(f"./workdir/{str(id)}_{i}/markers", exist_ok=True)
        # 确保 collage 列表长度足够
        while len(json_data["collage"]) <= i:
            json_data["collage"].append({
                "marker_config": [],
                "container_config": {},
                "emitter_config": {},
                "force_config": {}
            })
        
        # 处理标记点数据
        for j, marker_data in enumerate(collage_data["markers"]):
            print(collage_data["forces"])
            # 确保 marker_config 列表长度足够
            while len(json_data["collage"][i]["marker_config"]) <= j:
                json_data["collage"][i]["marker_config"].append({
                    "marker": [],
                    "visual_encoding": [],
                    "data": []
                })
            
            ##########################   marker ########################
            marker_id = marker_data["markerId"]
            marker_type = 'svg' if marker_data['thumbnail'].startswith('data:image/svg+xml;base64,') else 'png'
            marker_base64 = marker_data['thumbnail'].split(',')[1]
            marker_path = f"./workdir/{str(id)}_{i}/markers/"+str(marker_id)+"."+marker_type
            with open(marker_path, "wb") as f_marker:
                f_marker.write(base64.b64decode(marker_base64))
            json_data["collage"][i]["marker_config"][j]["marker"] = [marker_path]
            
            visualEncoding = None
            data = None
            for binding in collage_data.get("dataBinding", []):
                if binding.get("markerId") == marker_id:
                    visualEncoding = binding.get("visualEncoding")
                    data = binding.get("data")
                    break
            
            # 确保 visual_encoding 列表长度足够
            while len(json_data["collage"][i]["marker_config"][j]["visual_encoding"]) <= 0:
                json_data["collage"][i]["marker_config"][j]["visual_encoding"].append({})
            
            json_data["collage"][i]["marker_config"][j]["visual_encoding"][0]["channel"] = visualEncoding
            json_data["collage"][i]["marker_config"][j]["data"] = data

        
        ##########################   container ######################## 
        if collage_data["container"] != '':
            container_base64 = collage_data["container"].split(',')[1]
            container_path = f"./workdir/{str(id)}_{i}/container.png"
            with open(container_path, "wb") as f_container:
                f_container.write(base64.b64decode(container_base64))
            json_data["collage"][i]["container_config"]["container"] = container_path 
        ##########################   emitter ########################
        json_data["collage"][i]["emitter_config"]["control_points"] = [
            [point["x"]/canvas_width, point["y"]/canvas_height] for point in collage_data["emitter"]
        ]
        ##########################   forces ########################
        if len(collage_data["forces"]) > 0:
            force_type = collage_data["forces"][0]["type"]
            json_data["collage"][i]["container_config"]["boundary"] = "open"
            if force_type == "pointForce":
                json_data["collage"][i]["force_config"]["force_points"] = [
                    [force["coordinates"]["x"]/canvas_width, force["coordinates"]["y"]/canvas_height] for force in collage_data["forces"]
                ] 
                json_data["collage"][i]["force_config"]["force_type"] = "points"
            elif force_type == "fieldForce":
                rotation = collage_data["forces"][0]["rotation"]
                # 根据 rotation 计算单位向量，初始方向为正右（1,0），rotation为弧度制 
                x = math.cos(rotation)
                y = math.sin(rotation)
                json_data["collage"][i]["force_config"]["force_points"] = [x, y]
                json_data["collage"][i]["force_config"]["force_type"] = "indicate_direction"

    print(json_data)
    with open(f'./workdir/{str(id)}_{i}/collage.json', 'w') as f:
        json.dump(json_data, f, indent=4)
 
    
    unitopia.start_collage(f'./workdir/{str(id)}_{i}/collage.json',id = str(id))
    # 返回处理结果
    return jsonify({
        "success": True,
        "message": "数据接收成功"
    }), 200

 
if __name__ == '__main__': 
    
    app.run(host='0.0.0.0', port=5000, debug=True)
