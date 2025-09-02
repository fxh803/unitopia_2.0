from PIL import Image 
import base64
import cairosvg
from io import BytesIO
import cv2
import numpy as np 
from scipy.spatial import KDTree
from shapely.geometry import Polygon, Point
import random
import math
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
    r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]
    is_white = (r >= 250) & (g >= 250) & (b >= 250)
    binary = np.where(is_white, 0, 255).astype(np.uint8)  # 确保是uint8类型
    # 找到轮廓
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return None
    
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

def poisson_disk_sampling(contour, num_points, k=30):
    """
    在OpenCV轮廓内实现泊松盘采样
    
    参数:
        contour: OpenCV轮廓
        num_points: 要生成的点的数量
        k: 每个活跃点尝试生成新点的次数 (默认30)
    
    返回:
        采样点列表 [(x1,y1), (x2,y2), ...]
    """
    if contour is None or num_points <= 0:
        return []
    
    # 获取轮廓的边界框
    x, y, w, h = cv2.boundingRect(contour)
    
    # 计算泊松盘采样的最小距离
    # 基于轮廓面积和点数估算合适的距离
    contour_area = cv2.contourArea(contour)
    if contour_area <= 0:
        return []
    
    # 估算每个点应该占用的面积
    area_per_point = contour_area / num_points
    # 假设每个点占用圆形区域，计算半径
    radius = np.sqrt(area_per_point / np.pi)
    # 增加最小距离，确保点更分散
    radius = max(radius * 1.2, 10)  # 增加系数和最小距离
    
    # 将轮廓转换为多边形顶点
    polygon_points = contour.reshape(-1, 2).tolist()
    
    # 确定采样区域边界
    min_x, min_y = x, y
    max_x, max_y = x + w, y + h
    width = w
    height = h
    
    # 创建多边形对象
    polygon = Polygon(polygon_points)
    
    # 计算网格大小和网格单元数
    cell_size = radius / np.sqrt(2)
    grid_width = int(np.ceil(width / cell_size))
    grid_height = int(np.ceil(height / cell_size))
    
    # 初始化网格和点列表
    grid = [[None for _ in range(grid_height)] for _ in range(grid_width)]
    points = []
    active_list = []
    
    # 辅助函数：将点坐标转换为网格索引
    def to_grid_coords(point):
        x, y = point
        grid_x = int((x - min_x) / cell_size)
        grid_y = int((y - min_y) / cell_size)
        return grid_x, grid_y
    
    # 辅助函数：检查点是否在多边形内且远离其他点
    def is_valid_point(point):
        # 检查是否在多边形内
        if not polygon.contains(Point(point)):
            return False
        
        # 检查是否远离其他点
        x, y = point
        grid_x, grid_y = to_grid_coords(point)
        
        # 检查周围网格，扩大检查范围
        check_range = max(3, int(radius / cell_size) + 1)
        for i in range(max(0, grid_x - check_range), min(grid_width, grid_x + check_range + 1)):
            for j in range(max(0, grid_y - check_range), min(grid_height, grid_y + check_range + 1)):
                neighbor = grid[i][j]
                if neighbor is not None:
                    dx = neighbor[0] - x
                    dy = neighbor[1] - y
                    if dx * dx + dy * dy < radius * radius:
                        return False
        return True
    
    # 生成第一个点
    first_point_found = False
    attempts = 0
    max_attempts = 1000
    
    while not first_point_found and attempts < max_attempts:
        x = random.uniform(min_x, max_x)
        y = random.uniform(min_y, max_y)
        point = (x, y)
        if is_valid_point(point):
            grid_x, grid_y = to_grid_coords(point)
            grid[grid_x][grid_y] = point
            points.append(point)
            active_list.append(point)
            first_point_found = True
        attempts += 1
    
    if not first_point_found:
        raise ValueError("无法在多边形内找到初始点")
    
    # 主循环
    while active_list and len(points) < num_points:
        # 随机选择一个活跃点
        active_index = random.randint(0, len(active_list) - 1)
        active_point = active_list[active_index]
        point_found = False
        
        # 尝试生成k个新点
        for _ in range(k):
            # 在半径r到2r的环形区域内生成随机点
            angle = random.uniform(0, 2 * math.pi)
            distance = random.uniform(radius, 2 * radius)
            new_x = active_point[0] + distance * math.cos(angle)
            new_y = active_point[1] + distance * math.sin(angle)
            new_point = (new_x, new_y)
            
            # 检查点是否在边界内
            if not (min_x <= new_x <= max_x and min_y <= new_y <= max_y):
                continue
            
            # 检查点是否有效
            if is_valid_point(new_point):
                grid_x, grid_y = to_grid_coords(new_point)
                grid[grid_x][grid_y] = new_point
                points.append(new_point)
                active_list.append(new_point)
                point_found = True
                break
        
        # 如果没有找到新点，移除当前活跃点
        if not point_found:
            active_list.pop(active_index)
    
    # 如果生成的点太多，随机选择指定数量
    if len(points) > num_points:
        points = random.sample(points, num_points)
    
    return points