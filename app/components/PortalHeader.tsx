"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type PortalNavKey="home"|"requests"|"bookings"|"coordination"|"help";
type UserSummary={fullName:string;organization:string;role:string};
type NotificationItem={id:string;title:string;body:string;status:string;entityType:string;entityId:string;createdAt:number};

const nav:Array<{key:PortalNavKey;label:string;href:string}>=[
  {key:"home",label:"Trang chủ",href:"/portal"},
  {key:"requests",label:"Yêu cầu của tôi",href:"/portal/requests"},
  {key:"bookings",label:"Lịch & đặt chỗ",href:"/portal/bookings"},
  {key:"coordination",label:"Khách & sự kiện",href:"/portal/coordination"},
  {key:"help",label:"Trung tâm trợ giúp",href:"/portal/help"},
];
const roleLabels:Record<string,string>={tenant_member:"Thành viên khách hàng",customer_member:"Thành viên khách hàng",tenant_admin:"Quản trị doanh nghiệp",customer_admin:"Quản trị doanh nghiệp",service_desk:"Service Desk",facility_staff:"Nhân viên Facility",facility_manager:"Quản lý Facility",event_staff:"Nhân viên Event",event_manager:"Quản lý Event",security_staff:"An ninh & khách",system_admin:"Quản trị hệ thống",auditor:"Kiểm toán viên"};

function csrfHeaders(){const token=document.cookie.split(";").map(value=>value.trim()).find(value=>value.startsWith("nic_csrf="))?.slice(9)??"";return{"Content-Type":"application/json","X-CSRF-Token":decodeURIComponent(token)};}
function notificationHref(item:NotificationItem){if(["service_request","request"].includes(item.entityType))return "/portal/requests";if(["booking","space_booking"].includes(item.entityType))return "/portal/bookings";if(["visitor_registration","event_service_request"].includes(item.entityType))return "/portal/coordination";if(["maintenance_plan","asset"].includes(item.entityType))return "/portal/portfolio";return "/portal/reliability";}

export function PortalHeader({active,user:providedUser}:{active?:PortalNavKey;user?:UserSummary}){
  const[user,setUser]=useState<UserSummary|null>(providedUser??null),[notifications,setNotifications]=useState<NotificationItem[]>([]),[loading,setLoading]=useState(true);
  useEffect(()=>{let mounted=true;Promise.all([providedUser?Promise.resolve({user:providedUser}):fetch("/api/auth/session").then(async response=>{if(response.status===401){location.href="/auth";return{};}return response.json();}),fetch("/api/notifications").then(response=>response.ok?response.json():{notifications:[]})]).then(([session,noticeData])=>{if(!mounted)return;const typedSession=session as {user?:UserSummary};const typedNotices=noticeData as {notifications?:NotificationItem[]};if(typedSession.user)setUser(typedSession.user);setNotifications(typedNotices.notifications??[]);}).finally(()=>{if(mounted)setLoading(false);});return()=>{mounted=false;};},[providedUser]);
  const unread=notifications.filter(item=>item.status!=="read").length;
  async function markAllRead(){if(!unread)return;const response=await fetch("/api/notifications",{method:"POST",headers:csrfHeaders(),body:JSON.stringify({action:"mark_all_read"})});if(response.ok)setNotifications(current=>current.map(item=>({...item,status:"read"})));}
  async function logout(){await fetch("/api/auth/logout",{method:"POST",headers:csrfHeaders()});location.href="/auth";}
  async function revokeAll(){if(!confirm("Đăng xuất tài khoản này trên tất cả thiết bị?"))return;await fetch("/api/auth/revoke-all",{method:"POST",headers:csrfHeaders()});location.href="/auth";}
  const initials=user?.fullName.split(" ").slice(-1)[0].slice(0,2).toUpperCase()??"NIC";
  return <header className="portal-header"><a className="brand-lockup" href="/portal" aria-label="NIC Service Hub, trang chủ"><Image src="/nic-logo.png" alt="Vietnam National Innovation Center" width={142} height={54} priority unoptimized/><span><strong>Service Hub</strong><small>Dịch vụ tại NIC</small></span></a><nav className="portal-nav" aria-label="Điều hướng chính">{nav.map(item=><a key={item.key} className={active===item.key?"active":""} aria-current={active===item.key?"page":undefined} href={item.href}>{item.label}</a>)}</nav><div className="header-actions"><details className="notification-menu"><summary className="notification-button" aria-label={`Thông báo, ${unread} thông báo chưa đọc`}><span>Thông báo</span><b>{loading?"…":unread}</b></summary><section className="notification-popover"><header><div><strong>Thông báo</strong><small>{unread?`${unread} mục chưa đọc`:"Đã đọc tất cả"}</small></div>{unread>0&&<button onClick={()=>void markAllRead()}>Đánh dấu đã đọc</button>}</header>{notifications.length?<div>{notifications.map(item=><a key={item.id} href={notificationHref(item)} data-read={item.status==="read"}><strong>{item.title}</strong><span>{item.body}</span><time>{new Date(item.createdAt*1000).toLocaleString("vi-VN")}</time></a>)}</div>:<p>Hiện chưa có thông báo mới.</p>}</section></details><details className="portal-profile-menu"><summary className="profile-button"><span>{initials}</span><span><strong>{user?.fullName??"Đang tải tài khoản"}</strong><small>{user?`${roleLabels[user.role]??user.role} · ${user.organization}`:"Đang đồng bộ"}</small></span></summary><section><a href="/portal/requests">Hồ sơ dịch vụ</a><button onClick={()=>void logout()}>Đăng xuất</button><button onClick={()=>void revokeAll()}>Đăng xuất mọi thiết bị</button></section></details></div></header>;
}
