from PIL import Image 
import base64 
import cairosvg
from io import BytesIO
import cv2
import numpy as np

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
    
    # 提取alpha通道
    alpha = img_array[:, :, 3]
    
    # 创建二值图像（非透明像素为255，透明像素为0）
    binary = np.where(alpha > 0, 255, 0).astype(np.uint8)
    
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


def generate_uniform_points_in_contour(contour, num_points):
    """
    在给定轮廓内生成均匀分布的点
    
    Args:
        contour: OpenCV轮廓
        num_points: 要生成的点的数量
    
    Returns:
        点的列表，每个点是(x, y)元组
    """
    if contour is None or num_points <= 0:
        return []
    
    # 获取轮廓的边界框
    x, y, w, h = cv2.boundingRect(contour)
    
    # 创建一个掩码，只有轮廓内的区域为白色
    mask = np.zeros((h, w), dtype=np.uint8)
    
    # 调整轮廓坐标到边界框坐标系
    adjusted_contour = contour - [x, y]
    cv2.fillPoly(mask, [adjusted_contour], 255)
    
    # 找到掩码内的所有有效像素位置
    valid_points = np.where(mask == 255)
    valid_coords = list(zip(valid_points[1] + x, valid_points[0] + y))  # 转回原始坐标系
    
    if len(valid_coords) == 0:
        return []
    
    # 如果要求的点数大于可用位置，返回所有可用位置
    if num_points >= len(valid_coords):
        return valid_coords
    
    # 使用均匀采样选择点
    indices = np.linspace(0, len(valid_coords) - 1, num_points, dtype=int)
    selected_points = [valid_coords[i] for i in indices]
    
    return selected_points