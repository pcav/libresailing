# Tiller drive review

## Raymarine

After 5 years of intensive use, 6 [ST4000 tiller actuators](https://www.raymarine.com/en-us/our-products/boat-autopilots/autopilot-drive-units/cockpit-tiller-drive) replaced, taking some of them apart and checking their construction, I concluded that they are not really suitable for tough extended navigation.

## PCNautic

Therefore I looked for alternatives, and I found the [
Raymarine Tiller Drive Replacement kit
](https://pcnautic.com/en/product/st4000-tiller-drive-replacement-set).
The kit includes a [HB-DJ809 Linear Actuator](https://www.hbactuator.com/linear-actuator/hb-dj809.html) by [Wuxi Hongba](https://wxhongba.com), the water resistant wiring, plugs and boxes, and the support that fits in the Raymarine socket.
Wuxi Hongba was kind and professional sending me full and very detailed specs of the actuator. Plenty of data. By contrast, Raymarine doesn't provide specifications, so it's difficult to compare. Duty cycle is 25%, much more than enough in average sea conditions, probably not enough in a storm. However, the cycle limits seem related mostly to temperature, and in a storm the actuator should dissipate heat quite easily. I'll check in real use and over time. It must be noted that an extra actuator is very cheap (100-150 € I believe), so having spares is not an issue.
Major advantages over the Raymarine equivalent are, at least on paper:
- integrated drive position sensor (no need to buy an extra product, difficult to install on many boats including mine, rather exposed to damage)
- integrated stop at the end of the arm extension
- larger extension (>10°, 40 instead of 28°)
- less noisy
- less power hungry
- more powerful
- stronger built
- stronger, waterproof connectors SD20.
In addition, it's also far cheaper.
So, worth a try.

### The package
All the components appear solid and of good quality.
It's disappointing that the package does not include any instruction for the installation. The only hint I could get is a [video in Dutch](https://www.youtube.com/watch?v=gYL0_VjVxGI) and a [wiring schema](https://pcnautic.com/en/product/st4000-tiller-drive-replacement-set).

### Installing

Fairly straightforward, with a few exceptions:
- the wiring in the schema above was wrong (the firm sent a correction straight away)
- the plug to be mounted on the hull have not the same size and bolts of my Raymarine (on the video they were the same), so I had to cut a larger hole etc
- the thread of the same plug is too short to be mounted, so I had to adapt it.
In general I'd preferred if the thin cables were pre-stripped to the correct length.
The positive side is that the firm responded quickly to my questions, albeit answers were often a bit short, and required further clarifications.

### Commissioning

I followed the procedure as described in the Raymarine ACU-100 manual, with a few issues:
- the procedure requires to move the tiller arm at the center, left, right, and center again; this cannot be done by hand, so I had to bring power from the battery and move it by touching the motor +- wiring. At the end of this part of the procedure I had to put back the wires from ACU for its testing
- at the end of the procedure the control head stayed stuck at a final check, and I had to cut off the power; this does not make happy my nerdish soul
- at the end of all this the movements of the arm IN were smooth, whereas those OUT were discontinuous; in spite of my many tests and requests to [PCNautic](https://pcnautic.com/en/), we could not understand why, nor find a solution. It appears an issue of the ACU, not of the actuator or the wiring, because applying the current directly or unplugging and replugging the rudder position sensor make the movement smooth. It remains to be seen if this has any negative consequence.
The commissioning is easier if one prepares a SD20 connector with only + and -, with the option of inverting the polarity. I've done it. 

### Test at sea

After a few months, and thousands of miles, I'm completely satisfied.
In detail:
- sensor works well; less movement of the bar
- stop at the end work flawlessly (no more *drrrrrr*)
- extension useful for automated tacking
- noise reduced by far, often insignificant
- power consumption seems smaller (further measurements needed)
- higher strength confirmed
- general impression of solidity confirmed.
The mouvement IN is very smooth, that OUT is confirmed discontinuous, but it doesn't seem to be a problem.
The only limited downside is some hint of rust appearing on the body of the actuator, in the small steel part.

### Update

After 6 months of navigation the actuator suddenly stopped working, because of a failed switch at end of extension (it was only going out, no in movement). This is, according to HB, very difficult to repair, so I applied for warranty, and I bought a spare one at the same time.
The underlying problem is that the actuator is not done for marine use, so it requires water and rust proofing. Pity for such a good piece of hardware. According to the seller this is a rare problem, so maybe I've just been unlucky. Time will tell.
While examining the problem, I found the angled SD20 connector internal soldering rather fragile, especially on the very weak resistors necessary for position sensor. I suggest using straight connectors wherever possible.
