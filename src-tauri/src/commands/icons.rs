use crate::utils::DEFAULT_ICON_SIZE;
use std::path::Path;
use image::{DynamicImage, ImageFormat};
use base64::{engine::general_purpose, Engine as _};

const DEFAULT_ICON: &str = "default-icon";

fn img_to_base64(img: DynamicImage) -> Option<String> {
    let mut buf = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut buf), ImageFormat::Png).ok()?;
    Some(format!("data:image/png;base64,{}", general_purpose::STANDARD.encode(&buf)))
}

#[cfg(windows)]
fn get_system_icon(path: &str, _size: u32) -> Option<String> {
    use winapi::{
        shared::minwindef::DWORD,
        um::{shellapi, wingdi, winuser},
    };
    use std::ptr;
    use std::os::windows::ffi::OsStrExt;

    let wide_path: Vec<u16> = std::ffi::OsStr::new(path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut shfi = unsafe { std::mem::zeroed::<shellapi::SHFILEINFOW>() };
    let flags = shellapi::SHGFI_ICON | shellapi::SHGFI_USEFILEATTRIBUTES;
    
    let file_attrs = if Path::new(path).is_dir() {
        0x00000010
    } else {
        0x00000020
    };

    let res = unsafe {
        shellapi::SHGetFileInfoW(
            wide_path.as_ptr(),
            file_attrs,
            &mut shfi,
            std::mem::size_of::<shellapi::SHFILEINFOW>() as DWORD,
            flags,
        )
    };

    if res == 0 || shfi.hIcon.is_null() {
        return None;
    }

    let mut icon_info = unsafe { std::mem::zeroed::<winuser::ICONINFO>() };
    let success = unsafe { winuser::GetIconInfo(shfi.hIcon, &mut icon_info) };
    
    if success == 0 {
        unsafe { winuser::DestroyIcon(shfi.hIcon) };
        return None;
    }

    let hdc = unsafe { winuser::GetDC(ptr::null_mut()) };
    let hbm_color = icon_info.hbmColor;
    
    let mut bmp = wingdi::BITMAP {
        bmType: 0,
        bmWidth: 0,
        bmHeight: 0,
        bmWidthBytes: 0,
        bmPlanes: 0,
        bmBitsPixel: 0,
        bmBits: ptr::null_mut(),
    };
    
    unsafe {
        wingdi::GetObjectW(
            hbm_color as _,
            std::mem::size_of_val(&bmp) as i32,
            &mut bmp as *mut _ as *mut std::ffi::c_void,
        );
    }

    let width = bmp.bmWidth as u32;
    let height = bmp.bmHeight as u32;
    let mut buf = vec![0u8; (width * height * 4) as usize];

    let success = unsafe {
        let mut bmi = wingdi::BITMAPINFO {
            bmiHeader: wingdi::BITMAPINFOHEADER {
                biSize: std::mem::size_of::<wingdi::BITMAPINFOHEADER>() as DWORD,
                biWidth: width as i32,
                biHeight: -(height as i32),
                biPlanes: 1,
                biBitCount: 32,
                biCompression: 0,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [wingdi::RGBQUAD { rgbBlue: 0, rgbGreen: 0, rgbRed: 0, rgbReserved: 0 }; 1],
        };

        wingdi::GetDIBits(
            hdc,
            hbm_color,
            0,
            height as u32,
            buf.as_mut_ptr() as _,
            &mut bmi,
            wingdi::DIB_RGB_COLORS,
        )
    };

    unsafe {
        wingdi::DeleteObject(hbm_color as _);
        wingdi::DeleteObject(icon_info.hbmMask as _);
        winuser::DestroyIcon(shfi.hIcon);
        winuser::ReleaseDC(ptr::null_mut(), hdc);
    }

    if success == 0 {
        return None;
    }

    let img = DynamicImage::ImageRgba8(image::RgbaImage::from_raw(width, height, buf)?);
    img_to_base64(img)
}

#[cfg(not(windows))]
fn get_system_icon(_path: &str, _size: u32) -> Option<String> {
    None
}

#[tauri::command]
#[allow(non_snake_case)]
pub fn get_file_icon(filePath: String, size: Option<u32>) -> Result<String, String> {
    let size = size.unwrap_or(DEFAULT_ICON_SIZE);
    
    if !Path::new(&filePath).exists() {
        return Ok(DEFAULT_ICON.to_string());
    }

    match get_system_icon(&filePath, size) {
        Some(icon) => Ok(icon),
        None => Ok(DEFAULT_ICON.to_string()),
    }
}
