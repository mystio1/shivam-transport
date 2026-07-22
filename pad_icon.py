from PIL import Image

def make_square():
    img = Image.open('assets/icon.png')
    max_dim = max(img.size)
    
    # Create a new image with white background
    square_img = Image.new('RGB', (max_dim, max_dim), (255, 255, 255))
    
    # Calculate paste position
    offset = ((max_dim - img.size[0]) // 2, (max_dim - img.size[1]) // 2)
    
    # Paste image
    # If the image has an alpha channel, use it as a mask
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        square_img.paste(img, offset, img)
    else:
        square_img.paste(img, offset)
        
    square_img.save('assets/icon_square.png')

if __name__ == '__main__':
    make_square()
