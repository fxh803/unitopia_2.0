from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # 启用跨域支持

 

@app.route('/api/process-data', methods=['POST'])
def process_data(): 
    try:
        # 获取请求数据
        data = request.get_json() 
        # 读取example.json作为模板
        print(data)
        json_data = json.loads(open('./example.json', 'r').read()) 
        for i, data_item in enumerate(data):
            json_data["collage"][i]["marker_config"][0]["marker"] = data_item["markers"]
            json_data["collage"][i]["container_config"]["container"] = data_item["container"]
            json_data["collage"][i]["emitter"] = data_item["emitter"]
            json_data["collage"][i]["forces"] = data_item["forces"]
            json_data["collage"][i]["dataBinding"] = data_item["dataBinding"]
        
        # 返回处理结果
        return jsonify({
            "success": True,
            "message": "数据接收成功"
        }), 200
        
    except Exception as e:
        print(f"处理数据时出错: {str(e)}")
        return jsonify({"error": f"服务器内部错误: {str(e)}"}), 500

 
if __name__ == '__main__': 
    
    app.run(host='0.0.0.0', port=5000, debug=True)
