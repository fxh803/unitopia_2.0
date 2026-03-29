from PIL import Image 
import base64
import cairosvg
from io import BytesIO
import cv2
import numpy as np 
import cv2
import numpy as np
import random
from lxml import etree as ET
def base64_to_image(base64_data): 
    # 检查是否为 SVG
    if base64_data.startswith('data:image/svg+xml'): 
        png_data = cairosvg.svg2png(bytestring=image_data)
        return Image.open(BytesIO(png_data))
    else: 
        image_data = base64.b64decode(base64_data.split(',', 1)[1])
        return Image.open(BytesIO(image_data))
 

def transparency(image,color):
    # 将图像转换为灰度图像
    gray_image = image.convert('L')

    # 获取图像数据
    data = gray_image.getdata()
    threshold = 200  # 设置阈值

    # 创建一个新的图像对象，将白色部分变为透明色
    new_data = []
    for pixel in data:
        if pixel >= threshold:
            new_data.append((255, 255, 255, 0))  # 将白色部分变为透明色
        else:
            new_data.append((int(color[0]), int(color[1]), int(color[2]), int(color[3]*255)))  # 其他部分保持黑色

    # 创建新的图像对象
    new_image = Image.new('RGBA', gray_image.size)
    new_image.putdata(new_data)

    return new_image


def crop_to_content(image):
    """
    使用OpenCV contour bounding box裁剪图片到非透明区域
    """
    # 确保图片是RGBA模式
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # 转换为numpy数组
    img_array = np.array(image)
    
    # 提取alpha通道
    alpha = img_array[:, :, 3]
    
    # 创建二值图像（非透明像素为255，透明像素为0）
    binary = np.where(alpha > 0, 255, 0).astype(np.uint8)
    
    # 找到轮廓
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return image
    
    # 找到所有轮廓的边界框
    min_x, min_y = image.width, image.height
    max_x, max_y = 0, 0
    
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        min_x = min(min_x, x)
        min_y = min(min_y, y)
        max_x = max(max_x, x + w)
        max_y = max(max_y, y + h)
    
    # 如果没有找到有效区域，返回原图
    if min_x >= max_x or min_y >= max_y:
        return image
    
    # 裁剪图片
    cropped_image = image.crop((min_x, min_y, max_x, max_y))
    return cropped_image


def find_region_containing_point(image, pos):
    """
    找到包含指定点pos的非透明区域
    
    Args:
        image: PIL图像对象
        pos: 包含x,y坐标的字典 {'x': x_coord, 'y': y_coord}
    
    Returns:
        包含该点的轮廓区域，如果没有找到则返回None
    """
    # 确保图片是RGBA模式
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # 转换为numpy数组
    img_array = np.array(image) 
    alpha = img_array[:, :, 3]
    binary = np.where(alpha > 0, 255, 0).astype(np.uint8)  # 确保是uint8类型
    # 找到轮廓
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE) 
    
    # 检查哪个轮廓包含指定的点
    # 处理pos可能是列表或字典的情况
    if isinstance(pos, list) and len(pos) >= 2:
        point = (int(pos[0]), int(pos[1]))
    elif isinstance(pos, dict) and 'x' in pos and 'y' in pos:
        point = (int(pos['x']), int(pos['y']))
    else:
        return None
    
    for contour in contours:
        # 使用cv2.pointPolygonTest检查点是否在轮廓内
        result = cv2.pointPolygonTest(contour, point, False)
        if result >= 0:  # 点在轮廓内或边界上
            return contour
    
    return None

 


def grid_based_sampling(contour, num_points, canvas_width, canvas_height, container_alpha):
    """
    基于网格的采样，通过收缩轮廓避免点在边缘初始化
    
    Args:
        contour: OpenCV轮廓
        num_points: 需要生成的点数
        container_alpha: 可选的 alpha 矩阵(H,W)，用于过滤仅保留不透明区域(alpha>0)的点 
    
    Returns:
        (points, grid_size)
        points: 生成的点列表
        grid_size: 最终网格单元大小（像素）
    """
    if contour is None or num_points <= 0:
        return [], 0

    if container_alpha is not None:
        container_alpha = np.asarray(container_alpha)
    
    # 1. 获取轮廓边界框和面积
    x, y, w, h = cv2.boundingRect(contour)
    contour_area = cv2.contourArea(contour)
    if contour_area <= 0:
        return [], 0
    
    # 2. 收缩轮廓
    # 创建二值图像
    binary_img = np.zeros((canvas_height, canvas_width), dtype=np.uint8) 
    cv2.drawContours(binary_img, [contour], -1, 255, -1)
    
    # 3. 动态调整网格间距，确保生成的点数 >= num_points
    grid_size = int(np.sqrt(contour_area / num_points))
    
    # 腐蚀操作防止贴边
    erosion_size = max(1, grid_size // 2)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (erosion_size*2+1, erosion_size*2+1))
    shrunk_img = cv2.erode(binary_img, kernel, iterations=1)
    
    # 创建彩色图像，将两个轮廓用不同颜色显示
    # 创建3通道彩色图像
    comparison_img = np.zeros((canvas_height, canvas_width, 3), dtype=np.uint8)
    
    # 原轮廓用蓝色显示
    comparison_img[binary_img > 0] = [255, 0, 0]  # 蓝色 (BGR格式)
    
    # 收缩后轮廓用红色显示
    comparison_img[shrunk_img > 0] = [0, 0, 255]  # 红色 (BGR格式)
    
    # 重叠区域用绿色显示
    overlap = (binary_img > 0) & (shrunk_img > 0)
    comparison_img[overlap] = [0, 255, 0]  # 绿色 (BGR格式)
    
    # 保存对比图像
    # cv2.imwrite('contour_comparison.png', comparison_img)
    # print(f"已保存轮廓对比图像: contour_comparison.png")
    # print(f"蓝色: 原轮廓, 红色: 收缩后轮廓, 绿色: 重叠区域") 
    
    # 找到收缩后的轮廓
    shrunk_contours, _ = cv2.findContours(shrunk_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # 如果没有找到收缩后的轮廓，使用原轮廓
    if not shrunk_contours:
        target_contour = contour
    else:
        # 腐蚀后可能分裂为多个连通域，取面积最大的作为主区域
        target_contour = max(shrunk_contours, key=cv2.contourArea)
    
    # 4. 动态调整网格间距，确保生成的点数 >= num_points
    points = []
    
    max_iters = 50
    iters = 0
    while True:
        iters += 1
        points.clear()
        # 生成网格点
        for i in range(x, x + w, grid_size):
            for j in range(y, y + h, grid_size):
                if cv2.pointPolygonTest(target_contour, (i, j), False) >= 0:
                    if container_alpha is not None:
                        if 0 <= j < canvas_height and 0 <= i < canvas_width and container_alpha[j, i] > 0:
                            points.append((i, j))
                    else:
                        points.append((i, j))
        
        # 检查是否生成足够的点
        if len(points) >= num_points:
            break
        else:
            if grid_size <= 1 or iters >= max_iters:
                break
            # 缩小网格间距（例如每次减少10%）
            grid_size = max(1, int(grid_size * 0.9))  # 避免grid_size=0

    # 4. 随机下采样到目标点数（保证均匀性）
    if len(points) > num_points:
        # 计算轮廓质心
        M = cv2.moments(contour)
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
        else:
            cx, cy = x + w // 2, y + h // 2  # 退化为边界框中心
        # 按点到质心的距离排序 
        points.sort(key=lambda p: np.sqrt((p[0]-cx)**2 + (p[1]-cy)**2))
        
        # 保留最近的num_points个点 
        points = points[:num_points]
    
    return points


def rect_to_path(rect_element):
    """将rect元素转换为path元素"""
    x = float(rect_element.get('x', 0))
    y = float(rect_element.get('y', 0))
    width = float(rect_element.get('width', 0))
    height = float(rect_element.get('height', 0))
    rx = rect_element.get('rx', 0)
    ry = rect_element.get('ry', 0)
    
    # 处理圆角矩形
    if rx and ry:
        rx_val = float(rx)
        ry_val = float(ry)
        # 创建圆角矩形的path
        path_data = f"M {x},{y+ry_val} A {rx_val},{ry_val} 0 0,1 {x+rx_val},{y} H {x+width-rx_val} A {rx_val},{ry_val} 0 0,1 {x+width},{y+ry_val} V {y+height-ry_val} A {rx_val},{ry_val} 0 0,1 {x+width-rx_val},{y+height} H {x+rx_val} A {rx_val},{ry_val} 0 0,1 {x},{y+height-ry_val} Z"
    else:
        # 创建普通矩形的path
        path_data = f"M {x},{y} L {x+width},{y} L {x+width},{y+height} L {x},{y+height} Z"
    
    # 创建path元素
    path_element = ET.Element('path')
    path_element.set('d', path_data)
    
    # 复制其他属性
    for attr_name, attr_value in rect_element.attrib.items():
        if attr_name not in ['x', 'y', 'width', 'height', 'rx', 'ry']:
            path_element.set(attr_name, attr_value)
    
    return path_element


def ellipse_to_path(ellipse_element):
    """将ellipse元素转换为path元素"""
    cx = float(ellipse_element.get('cx', 0))
    cy = float(ellipse_element.get('cy', 0))
    rx = float(ellipse_element.get('rx', 0))
    ry = float(ellipse_element.get('ry', 0))
    
    # 创建椭圆的path
    path_data = f"M {cx-rx},{cy} A {rx},{ry} 0 1,1 {cx+rx},{cy} A {rx},{ry} 0 1,1 {cx-rx},{cy} Z"
    
    # 创建path元素
    path_element = ET.Element('path')
    path_element.set('d', path_data)
    
    # 复制其他属性
    for attr_name, attr_value in ellipse_element.attrib.items():
        if attr_name not in ['cx', 'cy', 'rx', 'ry']:
            path_element.set(attr_name, attr_value)
    
    return path_element


def complete_svg(marker_string):
    """完善SVG字符串，添加头部和尾部，并计算尺寸"""
    import re
    
    # 获取marker_string的最外围的<g>的transform="matrix(xx xx xx xx xx xx)"的最后两个数
    g_match = re.search(r'<g[^>]*transform="matrix\(([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\)"[^>]*>', marker_string)
    
    # 设置默认值
    scale_x = 100.0
    scale_y = 100.0
    if g_match:
        # 最后两个数是偏移量
        scale_x = float(g_match.group(5))
        scale_y = float(g_match.group(6))
    
    svg_width = scale_x * 2
    svg_height = scale_y * 2
    
    # 添加SVG头部和尾部（移除编码声明以避免lxml解析问题）
    svg_header = f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {svg_width} {svg_height}" width="{svg_width}" height="{svg_height}">\n'
    svg_footer = '\n</svg>'
    
    return svg_header + marker_string + svg_footer, svg_width, svg_height


def contains_image_element(svg_string):
    try:
        # 将字符串解析为 XML 树（注意编码为 bytes）
        root = ET.fromstring(svg_string.encode('utf-8'))
    except ET.XMLSyntaxError as e:
        print(f"[错误] SVG 字符串不是有效的 XML: {e}")
        return False

    # 使用 XPath 查找所有的 <image> 标签（无论是否在命名空间下）
    image_tags = root.findall('.//image')
    if not image_tags:
        # 方法2: 使用命名空间查找
        namespaces = {'svg': 'http://www.w3.org/2000/svg'}
        image_tags = root.findall('.//svg:image', namespaces)
    if not image_tags:
        # 方法3: 使用 XPath（如果支持）
        try:
            image_tags = root.xpath('//image | //svg:image', namespaces={'svg': 'http://www.w3.org/2000/svg'})
        except:
            pass
    print('image_tags',image_tags)
    return len(image_tags) > 0


def convert_shapes_to_paths(svg_string):
    """将SVG字符串中的rect和ellipse元素转换为path元素"""
    try:
        # 解析SVG字符串
        root = ET.fromstring(svg_string) 
        
        # 递归函数来查找并替换元素
        def replace_elements_in_tree(element):
            # 查找当前元素的直接子元素中的rect和ellipse
            children_to_replace = []
            for child in list(element):
                if child.tag.endswith('rect') or child.tag == 'rect':
                    children_to_replace.append((child, 'rect'))
                elif child.tag.endswith('ellipse') or child.tag == 'ellipse':
                    children_to_replace.append((child, 'ellipse'))
            
            # 替换找到的元素
            for child, shape_type in children_to_replace:
                if shape_type == 'rect':
                    new_element = rect_to_path(child)
                else:  # ellipse
                    new_element = ellipse_to_path(child)
                
                # 获取子元素在父元素中的索引
                parent = element
                child_index = list(parent).index(child)
                
                # 移除旧元素，插入新元素
                parent.remove(child)
                parent.insert(child_index, new_element)
            
            # 递归处理所有子元素
            for child in element:
                replace_elements_in_tree(child)
        
        # 从根元素开始处理
        replace_elements_in_tree(root)
        
        # 返回修改后的SVG字符串
        return ET.tostring(root, encoding='unicode')
    except ET.ParseError as e:
        print(f"XML解析错误: {e}")
        # 如果解析失败，返回原字符串
        return svg_string


def scale_path_coordinates(d_attribute, scale_factor):
    """缩放path元素的d属性中的坐标"""
    import re
    
    # 定义正则表达式来匹配数字（包括负数和小数）
    # 确保匹配完整的数字，包括科学计数法
    number_pattern = r'[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?'
    
    def replace_number(match):
        num = float(match.group())
        scaled = num * scale_factor
        # 如果原数字是整数，输出整数格式；否则保留适当的小数位
        if abs(scaled - round(scaled)) < 1e-6:
            return str(int(round(scaled)))
        else:
            # 保留最多6位小数
            return f"{scaled:.6f}".rstrip('0').rstrip('.')
    
    # 替换所有数字
    scaled_d = re.sub(number_pattern, replace_number, d_attribute)
    
    return scaled_d


def merge_svg_files(svg_paths, output_path, target_size=1000):
    """
    合并多个SVG文件，将所有路径缩放到指定的尺寸（1:1比例）
    
    参数:
        svg_paths: SVG文件路径列表
        output_path: 输出文件路径
        target_size: 目标尺寸（宽高，默认1000）
    """
    import os
    
    all_paths = []
    
    try:
        for svg_path in svg_paths:
            if not os.path.exists(svg_path):
                continue
                
            try:
                # 读取SVG文件
                with open(svg_path, 'r', encoding='utf-8') as f:
                    svg_content = f.read()
                
                # 解析SVG
                root = ET.fromstring(svg_content.encode('utf-8'))
                
                # 获取SVG的宽度和高度
                width = float(root.get('width', '1000'))
                height = float(root.get('height', '1000'))
                
                # 验证是否为1:1比例（允许小的误差）
                if abs(width - height) > 0.1:
                    print(f"警告: {svg_path} 的宽高比不是1:1 (width={width}, height={height})")
                
                # 计算缩放比例
                scale_factor = target_size / width
                
                # 查找所有path元素
                namespaces = {'svg': 'http://www.w3.org/2000/svg'}
                paths = root.findall('.//svg:path', namespaces)
                if not paths:
                    # 如果没有命名空间，尝试不使用命名空间查找
                    paths = root.findall('.//path')
                
                # 处理每个path元素
                for path in paths:
                    # 复制path元素的所有属性
                    path_dict = dict(path.attrib)
                    
                    # 缩放d属性中的坐标
                    if 'd' in path_dict:
                        path_dict['d'] = scale_path_coordinates(path_dict['d'], scale_factor)
                    
                    # 构建新的path元素XML字符串
                    attrs_str = ' '.join([f'{k}="{v}"' for k, v in path_dict.items()])
                    path_xml = f'<path {attrs_str}/>'
                    
                    all_paths.append(path_xml)
                    
            except Exception as e:
                print(f"读取或解析 {svg_path} 时出错: {e}")
                continue
        
        # 如果有路径元素，创建合并后的SVG
        if all_paths:
            merged_svg_content = f'''<?xml version="1.0" ?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="{target_size}" height="{target_size}">
  <defs/>
  <g>
'''
            # 添加所有path元素
            for path_xml in all_paths:
                merged_svg_content += f'    {path_xml}\n'
            
            merged_svg_content += '''  </g>
</svg>
'''
            # 保存合并后的SVG文件
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(merged_svg_content)
            
            print(f"已成功合并 {len(all_paths)} 个路径到 {output_path}")
            return True
        else:
            print("没有找到任何路径元素，无法合并")
            return False
            
    except Exception as e:
        print(f"合并 SVG 文件时出错: {e}")
        return False