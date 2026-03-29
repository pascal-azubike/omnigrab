import{c as i,a as l}from"./N2VJsvfN.js";import"./Cfeaj5By.js";import{f as p}from"./CiE1qEVL.js";import{I as f,s as m}from"./YkcBTUdE.js";import{l as d,s as B}from"./V5QH-NpV.js";function g(o,t){const r=d(t,["children","$$slots","$$events","$$legacy"]);/**
 * @license lucide-svelte v0.460.1 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e=[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16"}]];f(o,B({name:"circle-alert"},()=>r,{get iconNode(){return e},children:(s,a)=>{var n=i(),c=p(n);m(c,t,"default",{}),l(s,n)},$$slots:{default:!0}}))}function y(o,t=2){if(o===0)return"0 B";const r=1024,e=t<0?0:t,s=["B","KB","MB","GB","TB","PB","EB","ZB","YB"],a=Math.floor(Math.log(o)/Math.log(r));return parseFloat((o/Math.pow(r,a)).toFixed(e))+" "+s[a]}export{g as C,y as f};
