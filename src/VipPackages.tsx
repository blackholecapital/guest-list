import {VIP_PACKAGES} from "./packages";

export default function VipPackages(){

return (
<section className="vip-packages">

<h2>THE SCORES EXPERIENCE</h2>
<p>Reserve your VIP experience.</p>

<div className="vip-grid">

{VIP_PACKAGES.map(pkg=>(
<article className="vip-card" key={pkg.title}>

<img src={pkg.image}/>

<h3>{pkg.title}</h3>

<h4>{pkg.price}</h4>

<p>{pkg.description}</p>

<a
href={pkg.url}
target="_blank"
className="primary-button"
>
Reserve
</a>

</article>
))}

</div>

</section>
)

}
