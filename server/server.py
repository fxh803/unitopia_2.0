from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # 启用跨域支持

 

@app.route('/api/process-data', methods=['POST'])
def process_data():  
    # 获取请求数据
    data = request.get_json() 
    print(data)
    json_data = {
        "collage": []
    }
    for i, collage_data in enumerate(data):#这是要输入的数据
        # 确保 collage 列表长度足够
        while len(json_data["collage"]) <= i:
            json_data["collage"].append({
                "marker_config": [],
                "container_config": {},
                "emitter": {},
                "forces": []
            })
        
        # 处理标记点数据
        for j, marker_data in enumerate(collage_data["markers"]):
            # 确保 marker_config 列表长度足够
            while len(json_data["collage"][i]["marker_config"]) <= j:
                json_data["collage"][i]["marker_config"].append({
                    "marker": [],
                    "visual_encoding": [],
                    "data": []
                })
            
            json_data["collage"][i]["marker_config"][j]["marker"] = [marker_data["thumbnail"]]
            markerId = marker_data["markerId"]  
            visualEncoding = None
            data = None
            for binding in collage_data.get("dataBinding", []):
                if binding.get("markerId") == markerId:
                    visualEncoding = binding.get("visualEncoding")
                    data = binding.get("data")
                    break
            
            # 确保 visual_encoding 列表长度足够
            while len(json_data["collage"][i]["marker_config"][j]["visual_encoding"]) <= 0:
                json_data["collage"][i]["marker_config"][j]["visual_encoding"].append({})
            
            json_data["collage"][i]["marker_config"][j]["visual_encoding"][0]["channel"] = visualEncoding
            json_data["collage"][i]["marker_config"][j]["data"] = data

        json_data["collage"][i]["container_config"]["container"] = collage_data["container"]
        json_data["collage"][i]["emitter"]["control_points"] = collage_data["emitter"]
        json_data["collage"][i]["forces"] = collage_data["forces"] 
    print(json_data)
    with open('example.json', 'w') as f:
        json.dump(json_data, f, indent=4)
    # 返回处理结果
    return jsonify({
        "success": True,
        "message": "数据接收成功"
    }), 200

 
if __name__ == '__main__': 
    
    app.run(host='0.0.0.0', port=5000, debug=True)
