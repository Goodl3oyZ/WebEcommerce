AuthProvider คือ Component ที่ทำหน้าที่เป็น "พ่อ/แม่" หรือ "ผู้ให้" ข้อมูลลงไปให้ลูก ๆ (children)
มันใช้ <AuthContext.Provider value={...}> เพื่อ “แจกจ่าย” ค่าต่าง ๆ เช่น user, login, logout
แล้วมันจะ "ห่อ" หรือ "ครอบ" ทุก component อื่น ๆ ที่ต้องการเข้าถึงค่าพวกนี้
💡 เปรียบเทียบให้เห็นภาพ: AuthProvider = ร้านอาหาร
ส่วน <AuthContext.Provider value={...}> = เมนูที่บอกว่าร้านนี้มีอะไรให้กิน
ทุกคนที่นั่งในร้าน (children) สามารถ “สั่ง” ได้ตามที่ Provider ประกาศไว้

| องค์ประกอบ             | หน้าที่                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `AuthProvider`         | ห่อ component อื่น ๆ เพื่อแจก context ชื่อparent ที่จะเราไว้ห่อ |
| `AuthContext.Provider` | จุดที่กำหนดว่า context มีค่าอะไร                                |
| `children`             | ทุก component ที่อยู่ภายในจะใช้ context ได้                     |
| `useAuth()`            | ตัวช่วยให้เราใช้ context ได้สะดวก                               |

export function useAuth() {
return useContext(AuthContext);
}

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
function Navbar() {
const { user, login, logout } = useContext(AuthContext);
return <div>Hi, {user?.name}</div>;
}

-------------from above to below ------------------------------

import { useAuth } from '../context/AuthContext';
function Navbar() {
const { user, login, logout } = useAuth(); // 👈 เรียกง่ายขึ้นเยอะ
return <div>Hi, {user?.name}</div>;
}
