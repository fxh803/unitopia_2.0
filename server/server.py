from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime
import math
import base64
import re
import cairosvg
from unitopia import Unitopia 
app = Flask(__name__, template_folder='',static_folder="")
CORS(app)  # 启用跨域支持
unitopia = Unitopia() 
progress_data = {}
@app.route('/processDataApi', methods=['POST'])
def process_data():  
    
    # 获取请求数据
    request_data = request.get_json() 
    data = request_data['data']
    id = request_data['id']
    canvas_width = request_data['canvasWidth']
    canvas_height = request_data['canvasHeight'] 
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

        ##########################   marker ########################
        marker_type = 'svg'
        for marker_data in collage_data["markers"]:
            if marker_data['thumbnail'].startswith('data:image/png;base64,'):
                marker_type = 'png'
                break
        
        for j, marker_data in enumerate(collage_data["markers"]):
            # 确保 marker_config 列表长度足够
            while len(json_data["collage"][i]["marker_config"]) <= j:
                json_data["collage"][i]["marker_config"].append({
                    "marker": [],
                    "visual_encoding": [],
                    "data": []
                })
            
            marker_id = marker_data["markerId"]

            if marker_data['thumbnail'].startswith('data:image/png;base64,'):
                marker_base64 = marker_data['thumbnail'].split(',')[1]
                marker_path = f"./workdir/{str(id)}_{i}/markers/"+str(marker_id)+".png"
                with open(marker_path, "wb") as f_marker:
                    f_marker.write(base64.b64decode(marker_base64))
                json_data["collage"][i]["marker_config"][j]["marker"] = [marker_path]
            else:
                marker_string = marker_data['thumbnail']
                # 确保 marker_string 是完整的SVG格式
                if not marker_string.startswith('<svg'):
                    #获取marker_string的最外围的<g>的transform="matrix(xx xx xx xx xx xx)"的最后两个数
                    # 先找到最外围的<g>标签
                    g_match = re.search(r'<g[^>]*transform="matrix\(([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\)"[^>]*>', marker_string)
                    # 设置默认值
                    scale_x = 100.0
                    scale_y = 100.0
                    if g_match:
                        # 最后两个数是偏移量
                        scale_x = float(g_match.group(5))
                        scale_y = float(g_match.group(6))  
                    
                    svg_width = scale_x*2
                    svg_height = scale_y*2
                    # 添加SVG头部和尾部
                    svg_header = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 '+str(svg_width)+' '+str(svg_height)+'" width="'+str(svg_width)+'" height="'+str(svg_height)+'">\n'
                    svg_footer = '\n</svg>'
                    marker_string = svg_header + marker_string + svg_footer
                
                if marker_type == 'png':
                    # 将SVG转换为PNG
                    png_path = f"./workdir/{str(id)}_{i}/markers/"+str(marker_id)+".png"
                    # 使用cairosvg将SVG转换为PNG
                    cairosvg.svg2png(bytestring=marker_string.encode('utf-8'), write_to=png_path)
                    json_data["collage"][i]["marker_config"][j]["marker"] = [png_path]
                     
                else:
                    # 保存为SVG
                    marker_path = f"./workdir/{str(id)}_{i}/markers/"+str(marker_id)+".svg"
                    with open(marker_path, "w", encoding="utf-8") as f_marker:
                        f_marker.write(marker_string)
                    json_data["collage"][i]["marker_config"][j]["marker"] = [marker_path]

            visualEncoding = None
            data = None
            attribute = None
            for binding in collage_data.get("dataBinding", []):
                if binding.get("markerId") == marker_id:
                    visualEncoding = binding.get("visualEncoding")
                    attribute = binding.get("dataField")
                    data = binding.get("data")
                    break
            
            # 确保 visual_encoding 列表长度足够
            while len(json_data["collage"][i]["marker_config"][j]["visual_encoding"]) <= 0:
                json_data["collage"][i]["marker_config"][j]["visual_encoding"].append({})
            
            json_data["collage"][i]["marker_config"][j]["visual_encoding"][0]["channel"] = visualEncoding
            json_data["collage"][i]["marker_config"][j]["visual_encoding"][0]["attribute"] = attribute
            json_data["collage"][i]["marker_config"][j]["data"] = data

        
        ##########################   container ######################## 
        if collage_data["container"] and collage_data["container"] != '':
            container_base64 = collage_data["container"].split(',')[1]
            container_path = f"./workdir/{str(id)}_{i}/container.png"
            with open(container_path, "wb") as f_container:
                f_container.write(base64.b64decode(container_base64))
            json_data["collage"][i]["container_config"]["container"] = container_path 
        ##########################   emitter ########################
        if collage_data["emitter"] and len(collage_data["emitter"]) > 0:
            json_data["collage"][i]["emitter_config"]["control_points"] = [
                [point["x"]/canvas_width, point["y"]/canvas_height] for point in collage_data["emitter"]
            ]
        ##########################   forces ########################
        if collage_data["forces"] and len(collage_data["forces"]) > 0:
            force_type = collage_data["forces"][0]["type"]
            json_data["collage"][i]["container_config"]["boundary"] = "open"
            if force_type == "pointForce":
                json_data["collage"][i]["force_config"]["force_points"] = [
                    [force["coordinates"]["x"]/canvas_width, force["coordinates"]["y"]/canvas_height] for force in collage_data["forces"]
                ] 
                json_data["collage"][i]["force_config"]["force_type"] = "points"
            elif force_type == "fieldForce":
                rotation = collage_data["forces"][0]["rotation"] 
                rotation_rad = (rotation* math.pi) / 180 
                # 计算单位向量
                x = math.cos(rotation_rad)
                y = math.sin(rotation_rad)
                json_data["collage"][i]["force_config"]["force_points"] = [x, y]
                json_data["collage"][i]["force_config"]["force_type"] = "indicate_direction"
        json_data["collage"][i]['marker_config'][0]['init_size_ratio'] = 0.6
        json_data["collage"][i]['iterations'] = 300
 
    with open(f'./workdir/{str(id)}_{i}/collage.json', 'w') as f:
        json.dump(json_data, f, indent=4)
 
    
    unitopia.start_collage(f'./workdir/{str(id)}_{i}/collage.json',id = str(id),callback=collage_callback)
    # 返回处理结果
    return jsonify({
        "success": True,
        "message": "数据接收成功"
    }), 200

def collage_callback(result):
    progress_data[result['id']] = result

@app.route('/fetchProgressApi', methods=['GET'])
def fetch_progress_api():
     # 从请求参数中获取ID
    id = request.args.get('id')#str 
    # 获取进度
    res = progress_data.get(id,{}) 
    return res

if __name__ == '__main__': 
    
    app.run(host='0.0.0.0', port=5000, debug=True)
