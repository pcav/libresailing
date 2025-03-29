# Electical leaks

## Misurazioni da fare

* isolamento motore: Ohm motore-scafo
* interruttori stacca batterie>?
* isolamento scafo: Ohm fra negativo batterie e scafo
* interruttori unipolari? staccare tutti i negativi e riattaccarli uno per uno per vedere con quale cambia
* antenna VHF?

## Comment mesurer un courant de fuite ?

http://www.plaisance-pratique.com/Courant-de-fuite-nefaste

Ingrédients :

* un multimètre numérique à 15€
* quelques mètres de fil électrique souple
* une ampoule 5 watts 12 volts et son support (5€) qui protègera le multimètre d’un courant excessif en cas de court-circuit.

Deux essais sont à faire :

* Brancher le « - » du multimètre sur la carène métallique ou la pièce métallique à tester, régler le multimètre sur 1A ou 200mA
* Brancher le fil sortant de l’ampoule d’abord au « + » de la batterie, noter l’indication de l’ampèremètre
* Brancher le fil sortant de l’ampoule d’abord au « - » de la batterie, noter l’indication de l’ampèremètre

Dans les deux cas le courant doit être très faible, au maximum 1 ou 2 mA.
Soluzione Pro:

* Victron? VDO? [leakage tester](https://www.vdo-marine.de/uploads/tx_documents/DataSheet_Leaflet_GB_01.pdf)

### Attention :

Il faut faire ces essais avec « tout en marche » dans le bateau, car le défaut d’isolement pour venir d’un appareil et serait donc invisible si cet appareil est éteint.

## Locating Ground Faults and Short Circuits

https://www.boatingmag.com/how-to/locating-ground-faults-current-leaks-and-short-circuits/

### Short Circuit

What it is: When a direct connection between the hot and ground sides of a circuit is made and it bypasses the load (light, pump, whatever).

How to find it: Disconnect the circuit from its power source — remove the terminals at the panel — and disconnect the load (device, or devices if they're lights) from the circuit. Turn all switches for that circuit to the "on" position. Place the leads of the multimeter, set to the ohmmeter function, across the positive and negative sides of the circuit. A reading of infinite ohms means the circuit is good and the device is bad; a reading of less than infinity means there is a problem in the wiring.

### Ground Fault

What it is: Poor, worn or chafed insulation on switches, devices or wiring allows a lower-resistance path to ground (usually bilge water) than the ground wire of the circuit does.

How to find it:
1. Switch off all equipment individually and disconnect solar panels. Leave the battery switch on.
2. Disconnect the positive battery cable and, with the meter set to the DC volts setting, take a voltage reading between the battery terminal and the cable. If it reads 12 volts — or any voltage, really — you have a leak.
3. Turn the battery switch off.

* If...
the leak still shows — you still read voltage — the leak is on the battery side of the switch. The only things that should be there — hot-wired to the battery — are the bilge pumps.

* Then...
rewire and reroute, supporting everything as high as possible.

* If...
closing the battery switch with the meter still connected to the post and disconnected, and if the leak "disappears" (no voltage reading), the leak is on the boat side of the system.

* Then...
to isolate it, keep the battery switch on, leave the meter connected and go to the fuse or breaker panel. Begin systematically closing breakers and pulling fuses. If the meter reads no voltage after breaking a circuit, that's the guilty party.

* If...
the leak still shows, it's one of the breakers or the panel itself that's leaking.

* Then...
set the meter to ohms, and then systematically remove each breaker, testing across its terminals. With the breaker off, the reading should be infinite; if not, you have finally found the offender.

Tip: It's often quicker to find many ground faults by simple visual observation, checking for any wires that have drooped into the bilge water or show obvious signs of chafe and wear, and then starting the meter readings with those circuits. Bilge, washdown or livewell pumps are common culprits — but not always.

## Investigating electrical leaks

https://marc-hanami.blogspot.com/2013/03/investigating-electrical-leaks-update.html

### A - PREPARATION

From the battery bank (BB) identify all the existing connections:

* Normally there should be only one going to the main control panel (CP) by the chart table.
* This his almost never the case as devices that were installed in a second or third phase are usually connected directly to the battery bank like SSB, WaterMaker and so on ....
* The ones that will start/work  are those connected directly and after their cables and connection have been identified it is a good idea to label them and take some pictures.
* Once this is done all those devices should be disconnected from the BB, up until nothing remains connected, except the CP with all its switches OFF.

In this final position only the leak detector should be left ON.
And if the cables haven't been labelled and are difficult to identify it might be useful to have a digital multimeter, some wire, etc to do some testing.

It is a good idea, at this point, to build a table of all devices and to use it as a checklist for the next steps.

Example 

DEVICE |	Direct connection |	Connected via CP |	Leaks if connected |	Leaks if switched ON
--- | --- | --- | ---
Chart plotter | |		YES|	no|	no
Mast lights	| |	YES |	YES|	YES
Water maker|	YES	| |	no|	YES
SSB Radio |	YES	| |	no |	no

Direct     : means directly connected,
CP         : means through the Control Panel
Connected  : is (+) if the leaks exists after reconnection 
Swiched ON : is (+) if the leaks appears when the device is switched ON

According to the table, in our test case:

* The chart plotter is OK.
* The mast lights cables definitively have an issue.
* The water maker generate a leak when it runs.
* The SSB is OK.

### B - TEST


#### B.1 - Direct connection

Now one can manually and carefully re-connect the directly connected devices, one after the other, and each time test for a leak in 2 steps:

1 - after re-connection whilst the device is still switched OFF and
2 - after switching ON the device.

Doing it this way, should help differentiating leaks due to the connection cable from those due to the device itself.
Once tested the device may be kept connected or disconnect for more security but disconnection seems better as it eliminate all possible 'falsly positive'.
Then the result should be logged on the check list and, even if positive, it is almost mandatory to move to the next device as there can be several devices leaking.
Normally, following those steps it should be possible to identify which one is the culprit.

#### B.2 - Connections through the Control Panel (CP)

Wether a possible culprit has been found or not, at that stage the same process has to be reproduced with the devices connected to through the CP by switching them all, one after the other, and logging the result on the check list.

Here again it is the same 2 steps process:

- Connect through the switch panel, then
- Turn ON

and at each step look for a leak and log the result.

### C - RESULTS and LAST CONTROLS

Normally at this point the leak's origin should have been identified but there could be case where is still there and no culprit has been identified.
If that's the case, it is worth investigating the connections between the different elements of the Battery Bank as the cables might have been suffering from chafe if not properly protected or fixed.
If this proves negative then it is time to check if it is not the leak detector that has a problem or if it wrongly wired.
Among the usual suspect are:

* The VHF antennas and antenna splitters.
* All lights and devices on the mast, including the radar.
* The cables from the wind turbine and the solar panels because of chafe.
* The alternator.

This is definitely a painful and time consuming exercise but it is worth doing it well by documenting the results by filling the checklist table and taking pictures of the connection after they have been labelled.


## How to determine if my boat has an electrical "leak"

https://www.sailnet.com/threads/how-to-determine-if-my-boat-has-an-electrical-leak.31620/post-138064

If you want to test to see if you have a DC-based ground leak, the test for that is rather simple. The steps for seeing if you have a DC-ground leak are as follows:

First—the preliminary diagnosis test:

1) Turn off all equipment and disconnect any solar panels
2) Disconnect the positive side of the battery banks.
3) Leave the main battery isolation switch turned on for the bank in question
4) Set the meter to VDC mode, range appropriate for your battery bank
5) Connect the meter between the positive terminal and the disconnected cable

The meter should give no reading. If it reads XX volts for your XX VDC system, one of two things is happening.

1) You've left some equipment connected and turned on. This could be a bilge pump, a power feed to a stereo for the radio's memory and clock functions, or a hard-wired fume detector.

2) If you've disconnected all the "hard-wired" equipment and still get a reading, then you've most likely got a ground leak in your boat's DC system.

The Ground Leak Check:

1) Set the meter in Ohm mode and set it to the lowest range (x1).
2) Connect the leads of the Ohm-meter (or multimeter in Ohm mode) to the disconnected positive lead and the negative terminal of the battery.

The meter is now reading the resistance of any circuit to ground that exists in the boat's wiring. The reading on the Ohm meter display can help you identify the cause of the leak.

0-10 Ohms means it is most likely a piece of equipment left on
10-1k Ohms is a low-drain piece of equipment left on, or a serious ground leak
1k-10k Ohms is a minor leak
10k+ Ohms is an insignificant leak

How Big is The Leak?

The ammeter function of the multi-meter can tell you what the current leakage is. If your meter can read up to 10 Amps DC, then you can use it to measure amperage for leaks down to about 1.3 Ohms resistance on a 12 VDC system, or 2.6 Ohms for a 24 VDC system.

To see how big the leak is, put the probes on the positive battery post and the disconnected cable. The meter readings can be interpreted as shown:

<1mA — insignificant leakage
1–10mA — minor leakage
10mA–1A — major leak or some equipment left on
\>1A — Usually some equipment left on.

## Dispersioni galvaniche

* filo Ag> misura mV 865 (poppa 850 prua 880) deve essere > 780+150= 930 fino a 1080

Descrizione completa: http://www.plaisance-pratique.com/Mesures-de-controle-en-protection
 
* system I use to measure electric difference with a simple multimeter: simple [ECG AgCl silver-chlorid electrode](https://www.amazon.it/Elettrodi-pregellati-ovali-36x45-F9089/dp/B01AJSY9SQ/) connected hermetically with a small long cable (as +) and other simple cable as - Then I drop the ECG electrode (attached to a small stone for immersion) to water, I connect it to multimeter and the - I touch the aluminum or engine and this way you measure the current in millivolts and compare to tables of galvanic potential. I found this on a forum about galvanic corrosion. The ECG electrode is placed on a piece of plastic cover with a small hole allowing ONLY the AgCl (reference metal) to be in contact with sea water. On the backside it’s connected to a simple cable, closed hermetically with ducktape and brought to multimeter. See: [photos](/ovni32/docs/fsm/galvanic-meter/)

* if you want to know whether your anodes are protecting well, measure the voltage between water and hull. Therefore you will need a silver electrode or, as I do, a silver wire (which you can order online or buy in some crafts store). The hull will be positive, water negative. A reading between 900 and 1100 mV will give you good protection. <900mV is underprotected, >1100mV is overprotected.

## Altre pagine possibili

https://www.boatzincs.com/corrosion-reference-electrode.html
https://www.edt.co.uk/Hull%20Potential
http://www.plaisance-pratique.com/-La-corrosion-des-metaux-en-mer-
https://duckduckgo.com/?q=how+to+check+for+electrical+leaks+in+an+aluminium+boat&ia=web
