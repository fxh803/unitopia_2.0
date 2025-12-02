from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime
import math
import base64
import re
import cairosvg
from PIL import Image
from unitopia import Unitopia 
from utils import *
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
    for i, collage_data in enumerate(data):#这是单个collage任务中的多个collage子任务
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
        
        # 处理所有markers
        for j, marker_data in enumerate(collage_data["markers"]):
            # 确保 marker_config 列表长度足够
            while len(json_data["collage"][i]["marker_config"]) <= j:
                json_data["collage"][i]["marker_config"].append({
                    "marker": [],
                    "visual_encoding": [],
                    "data": []
                })
            marker_id = marker_data["markerId"]
            marker_string = marker_data['thumbnail']
            init_pos = [[point["x"]/canvas_width, point["y"]/canvas_height] for point in marker_data['pos']]
            init_angle = [angle for angle in marker_data['angle']]
            # 完善SVG字符串
            marker_string, svg_width, svg_height = complete_svg(marker_string)
            # 首先检查是否有任何marker包含image元素
            has_image_markers = False
            if contains_image_element(marker_string):
                has_image_markers = True 
            if has_image_markers:
                init_size = [[w/500, h/500] for w, h in zip(marker_data['width'], marker_data['height'])]
                # 如果任何一个marker包含image元素，所有marker都保存为PNG
                png_path = f"./workdir/{str(id)}_{i}/markers/"+str(marker_id)+".png"
                # 使用cairosvg将SVG转换为PNG
                cairosvg.svg2png(bytestring=marker_string.encode('utf-8'), write_to=png_path, output_width=svg_width, output_height=svg_height)
                
                # 确保PNG图像有Alpha通道
                try:
                    img = Image.open(png_path)
                    if img.mode != 'RGBA':
                        img = img.convert('RGBA')
                        img.save(png_path)
                except Exception as e:
                    print(f"处理PNG Alpha通道时出错: {e}")
                
                json_data["collage"][i]["marker_config"][j]["marker"] = [png_path]
            else:
                init_size = [[w/80, h/80] for w, h in zip(marker_data['width'], marker_data['height'])]
                # 如果没有任何marker包含image元素，检查并转换rect和ellipse元素为path元素
                marker_string = convert_shapes_to_paths(marker_string)
                # 保存为SVG
                marker_path = f"./workdir/{str(id)}_{i}/markers/"+str(marker_id)+".svg"
                with open(marker_path, "w", encoding="utf-8") as f_marker:
                    f_marker.write(marker_string)
                json_data["collage"][i]["marker_config"][j]["marker"] = [marker_path]

            json_data["collage"][i]["marker_config"][j]["init_pos"] = init_pos
            json_data["collage"][i]["marker_config"][j]["init_angle"] = init_angle
            json_data["collage"][i]["marker_config"][j]["init_size"] = init_size

            visualEncoding = None
            data = None
            attribute = None
            for binding in collage_data.get("dataBinding", []):
                if binding.get("markerId") == marker_id: 
                    data = binding.get("data")
                    break
            
            # 确保 visual_encoding 列表长度足够
            while len(json_data["collage"][i]["marker_config"][j]["visual_encoding"]) <= 0:
                json_data["collage"][i]["marker_config"][j]["visual_encoding"].append({})
            
            json_data["collage"][i]["marker_config"][j]["visual_encoding"][0]["channel"] = visualEncoding
            json_data["collage"][i]["marker_config"][j]["visual_encoding"][0]["attribute"] = attribute
            json_data["collage"][i]["marker_config"][j]["data"] = [1]*len(data)

            json_data["collage"][i]["marker_config"][j]["rotation"] = collage_data["rotation"]
            if collage_data["orientation"] == "center":
                json_data["collage"][i]["marker_config"][j]["orientation"] = collage_data["orientation"]
            json_data["collage"][i]["marker_config"][j]["margin"] = collage_data["margin"]

        
        ##########################   container ######################## 
        if collage_data["container"] and collage_data["container"] != '': 
            mask = base64_to_image(collage_data["container"])
            mask_array = np.array(mask)  
            # 检测RGB不为白色的区域
            alpha = mask_array[:, :, 3]
            binary = np.where(alpha > 0, 0, 255).astype(np.uint8)
            binary_image = Image.fromarray(binary)
            container_path = f"./workdir/{str(id)}_{i}/container.png"
            binary_image.save(container_path)
            json_data["collage"][i]["container_config"]["container"] = container_path 
            
            if collage_data["hole"]:
                json_data["collage"][i]["container_config"]["holes"] = collage_data["hole"]
            else:
                json_data["collage"][i]["container_config"]["holes"] = None
        ##########################   emitter ########################
        if collage_data["emitter"] and len(collage_data["emitter"]) > 0:
            json_data["collage"][i]["emitter_config"]["control_points"] = [
                [point["x"]/canvas_width, point["y"]/canvas_height] for point in collage_data["emitter"]
            ]
            json_data["collage"][i]["emitter_config"]["emitter_type"] = collage_data["emitter_type"]
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
        # json_data["collage"][i]['marker_config'][0]['init_size_ratio'] = 0.6
        json_data["collage"][i]['iterations'] = collage_data["iterations"]
        json_data["collage"][i]['render_size'] = collage_data["render_size"]
 
    with open(f'./workdir/{str(id)}_collage.json', 'w') as f:
        json.dump(json_data, f, indent=4)
 
    
    unitopia.start_collage(f'./workdir/{str(id)}_collage.json',id = str(id),callback=collage_callback)
    
    # # 合并所有 final_1.svg 文件
    # svg_paths = [f'./workdir/{str(id)}_{i}/final_1.svg' for i in range(len(data))]
    # merged_svg_path = f'./workdir/{str(id)}_result.svg'
    # merge_svg_files(svg_paths, merged_svg_path, target_size=1000)
    
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
@app.route('/uploadContainerApi', methods=['POST'])
def upload_container_api():
    request_data = request.get_json()
    container = request_data['container']
    color = request_data['containerColor']
    container = base64_to_image(container) 
    container = transparency(container,color) 
    # 裁剪到非透明区域
    container = crop_to_content(container)
    buffer = BytesIO()
    container.save(buffer, format='PNG')
    image_bytes = buffer.getvalue()
    # 将字节流编码为 Base64 字符串
    base64_string = base64.b64encode(image_bytes).decode('utf-8') 
    # 添加base64头部
    base64_with_header = f"data:image/png;base64,{base64_string}"
    return jsonify({"container": base64_with_header })
@app.route('/markerDropApi', methods=['POST'])
def marker_drop_api():
    request_data = request.get_json()
    markerData = request_data['markerData']
    container = request_data['container']
    container = base64_to_image(container) 
    pos = request_data['pos']
    
    # 1. 统计markerData的长度
    num_markers = len(markerData)

    # 2. 在container图像上找到pos所在的非透明区域
    contour = find_region_containing_point(container, pos)
    # 获取container的宽高
    width, height = container.size
    if contour is None:
        # 如果点击位置没有在非透明区域内，返回错误
        return jsonify({
            "success": False,
            "message": "点击位置不在有效区域内",
            "init_pos": []
        })
    
    # 3. 在找到的区域内生成均匀分布的点 
    uniform_points = grid_based_sampling(contour, num_markers,width,height)
    # 将点坐标转换为字典格式
    init_positions = [{"x": int(point[0]), "y": int(point[1])} for point in uniform_points]
    
    return jsonify({
        "success": True,
        "message": f"成功为{num_markers}个标记生成了{len(init_positions)}个初始位置",
        "init_pos": init_positions
    })

@app.route('/getRenderTxtApi', methods=['GET'])
def get_render_txt_api():
    """获取指定 id 和 collage_idx 的 render_files 目录下所有 txt 文件的 base64 字符串列表"""
    id = request.args.get('id')
    collage_idx = request.args.get('collage_idx')
    # 构建目录路径
    render_dir = f"./workdir/{id}_{collage_idx}/render_files"
    # 获取所有 txt 文件
    txt_files = []
    try:
        # 先收集所有 txt 文件名
        filenames = [f for f in os.listdir(render_dir) if f.endswith('.txt')]
        filenames.sort(key=lambda name: int(name.split('.')[0]))
        # 按顺序读取文件内容
        for filename in filenames:
            txt_path = os.path.join(render_dir, filename)
            with open(txt_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                txt_files.append(content)
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"读取文件时出错：{str(e)}"
        }), 500
    
    return jsonify({
        "success": True,
        "data": txt_files,
        "count": len(txt_files)
    }), 200

@app.route('/workdir/<path:filename>')
def serve_workdir(filename):
    """提供 workdir 下的静态文件，并设置长期缓存"""
    response = send_from_directory('./workdir', filename)
    # 设置缓存时间为 1 小时 (3600 秒)
    response.cache_control.max_age = 3600
    response.cache_control.public = True
    return response

if __name__ == '__main__': 
    
    app.run(host='0.0.0.0', port=4444, debug=True)
