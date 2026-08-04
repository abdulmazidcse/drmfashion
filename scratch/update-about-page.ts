import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const blocks = [
  // 1. Hero block
  {
    "id": "block_hero_1",
    "type": "hero",
    "props": {
      "heading": "ABOUT TALLPLUS",
      "subheading": "Redesigning fashion for proportional fit and real comfort.",
      "buttonText": "Discover Collections",
      "buttonLink": "/shop",
      "backgroundImage": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80",
      "backgroundColor": "#18181b",
      "overlayOpacity": 50,
      "textAlign": "center",
      "height": "medium",
      "textColor": "#ffffff"
    }
  },
  {
    "id": "block_spacer_1",
    "type": "spacer",
    "props": {
      "height": 50
    }
  },
  
  // 2. Our Story (Text left, Image right)
  {
    "id": "block_story",
    "type": "two-column",
    "props": {
      "leftHtml": "<h2 style=\"font-size: 1.85rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.25rem; color: #18181b;\">Our Story</h2><p style=\"font-size: 1.05rem; line-height: 1.8; color: #4b5563; margin-bottom: 1.25rem;\">For over 15 years, we have been working behind the scenes of the fashion industry, creating and sourcing garments for brands around the world. From North America to Asia, we have partnered with companies across different countries, bringing ideas to life through craftsmanship, attention to detail, and a deep understanding of clothing production.</p><p style=\"font-size: 1.05rem; line-height: 1.8; color: #4b5563;\">After years of creating quality garments for others, we realized something important: There were still millions of people struggling to find clothing that truly fits them. That is where Tallplus began.</p>",
      "rightHtml": "",
      "leftImage": "",
      "rightImage": "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80",
      "leftWidth": "50",
      "gap": "large",
      "reverseOnMobile": false
    }
  },
  {
    "id": "block_spacer_2",
    "type": "spacer",
    "props": {
      "height": 50
    }
  },
  
  // 3. 15 Years Behind the Seams (Image left, Text right)
  {
    "id": "block_seams",
    "type": "two-column",
    "props": {
      "leftHtml": "",
      "rightHtml": "<h2 style=\"font-size: 1.85rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.25rem; color: #18181b;\">15 years behind the seams</h2><p style=\"font-size: 1.05rem; line-height: 1.8; color: #4b5563; margin-bottom: 1.25rem;\">Before Tallplus became a brand, we were a trusted sourcing and manufacturing partner. For years, we studied every detail of garment creation from fabric selection and denim construction to measurements, fitting, and final production.</p><p style=\"font-size: 1.05rem; line-height: 1.8; color: #4b5563;\">Working with different markets around the world taught us one thing: Great clothing starts with understanding the person who wears it. Our experience gave us the knowledge to create clothing that is not only stylish but also comfortable, durable, and made with purpose.</p>",
      "leftImage": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
      "rightImage": "",
      "leftWidth": "50",
      "gap": "large",
      "reverseOnMobile": true
    }
  },
  {
    "id": "block_spacer_3",
    "type": "spacer",
    "props": {
      "height": 50
    }
  },

  // 4. Why we created TallPlus (Text left, Image right)
  {
    "id": "block_why_created",
    "type": "two-column",
    "props": {
      "leftHtml": "<h2 style=\"font-size: 1.85rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.25rem; color: #18181b;\">Why we created TallPlus</h2><p style=\"font-size: 1.05rem; line-height: 1.8; color: #4b5563; margin-bottom: 1.25rem;\">Finding the right clothing should not be a challenge. Many tall and plus-size individuals have experienced the frustration of limited choices of clothing that is too short, uncomfortable, or not designed around their proportions.</p><p style=\"font-size: 1.05rem; line-height: 1.8; color: #4b5563;\">We believed people deserved more options, more comfort, and more confidence. Tallplus was created to change the way people experience clothing by offering better fits, more choices, and customization designed around real people.</p>",
      "rightHtml": "",
      "leftImage": "",
      "rightImage": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
      "leftWidth": "50",
      "gap": "large",
      "reverseOnMobile": false
    }
  },
  {
    "id": "block_spacer_4",
    "type": "spacer",
    "props": {
      "height": 50
    }
  },

  // 5. The People Behind Tallplus (Image left, Text right)
  {
    "id": "block_people",
    "type": "two-column",
    "props": {
      "leftHtml": "",
      "rightHtml": "<h2 style=\"font-size: 1.85rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.25rem; color: #18181b;\">The people behind tallplus</h2><p style=\"font-size: 1.05rem; line-height: 1.8; color: #4b5563; margin-bottom: 1.25rem;\">Tallplus is built by a team of people who believe in this vision. Behind every piece is a group of designers, makers, and workers who have dedicated years to perfecting their craft.</p><p style=\"font-size: 1.05rem; line-height: 1.8; color: #4b5563;\">Even through challenges, our team continued to believe in building something greater: a brand that represents confidence, opportunity, and a better future for customers around the world. Every product carries the dedication, experience, and passion of the people who created it.</p>",
      "leftImage": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
      "rightImage": "",
      "leftWidth": "50",
      "gap": "large",
      "reverseOnMobile": true
    }
  },
  {
    "id": "block_spacer_5",
    "type": "spacer",
    "props": {
      "height": 55
    }
  },

  // 6. Centered Mission Block
  {
    "id": "block_divider_1",
    "type": "divider",
    "props": {
      "style": "solid",
      "color": "#e4e4e7",
      "marginTop": 10,
      "marginBottom": 40,
      "thickness": 1
    }
  },
  {
    "id": "block_mission",
    "type": "text",
    "props": {
      "html": "<h2 style=\"text-align: center; font-size: 2.25rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.5rem; color: #18181b;\">Our Mission</h2><p style=\"text-align: center; font-size: 1.25rem; line-height: 1.8; color: #4b5563; max-width: 800px; margin: 0 auto;\">Our mission is to create high-quality clothing that helps people feel comfortable, confident, and proud of who they are. We want every customer to have the freedom to choose clothing that matches their body, their style, and their personality. Because everyone deserves clothing that makes them feel their best.</p>",
      "align": "center",
      "maxWidth": "wide"
    }
  },
  {
    "id": "block_divider_2",
    "type": "divider",
    "props": {
      "style": "solid",
      "color": "#e4e4e7",
      "marginTop": 40,
      "marginBottom": 10,
      "thickness": 1
    }
  },
  {
    "id": "block_spacer_6",
    "type": "spacer",
    "props": {
      "height": 55
    }
  },

  // 7. What makes Tallplus different (Text left, Image right)
  {
    "id": "block_different",
    "type": "two-column",
    "props": {
      "leftHtml": "<h2 style=\"font-size: 1.85rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.5rem; color: #18181b;\">What makes Tallplus different</h2><div style=\"space-y-4\"><div style=\"margin-bottom: 1.25rem;\"><h4 style=\"font-weight: 800; text-transform: uppercase; font-size: 0.95rem; margin-bottom: 0.25rem; color: #18181b;\">Global Sourcing Expertise</h4><p style=\"font-size: 0.95rem; line-height: 1.6; color: #4b5563;\">Built on years of garment knowledge and global production experience.</p></div><div style=\"margin-bottom: 1.25rem;\"><h4 style=\"font-weight: 800; text-transform: uppercase; font-size: 0.95rem; margin-bottom: 0.25rem; color: #18181b;\">Customization Options</h4><p style=\"font-size: 0.95rem; line-height: 1.6; color: #4b5563;\">Clothing designed with flexibility, giving customers more control over their perfect fit.</p></div><div style=\"margin-bottom: 1.25rem;\"><h4 style=\"font-weight: 800; text-transform: uppercase; font-size: 0.95rem; margin-bottom: 0.25rem; color: #18181b;\">Quality First Approach</h4><p style=\"font-size: 0.95rem; line-height: 1.6; color: #4b5563;\">Carefully selected materials, thoughtful construction, and attention to detail.</p></div><div><h4 style=\"font-weight: 800; text-transform: uppercase; font-size: 0.95rem; margin-bottom: 0.25rem; color: #18181b;\">Made For Real People</h4><p style=\"font-size: 0.95rem; line-height: 1.6; color: #4b5563;\">Created for those who have often been overlooked by traditional sizing.</p></div></div>",
      "rightHtml": "",
      "leftImage": "",
      "rightImage": "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
      "leftWidth": "50",
      "gap": "large",
      "reverseOnMobile": false
    }
  },
  {
    "id": "block_spacer_7",
    "type": "spacer",
    "props": {
      "height": 50
    }
  },

  // 8. Our Future (Image left, Text right)
  {
    "id": "block_future",
    "type": "two-column",
    "props": {
      "leftHtml": "",
      "rightHtml": "<h2 style=\"font-size: 1.85rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.5rem; color: #18181b;\">Our future</h2><div style=\"space-y-4\"><div style=\"margin-bottom: 1.25rem;\"><h4 style=\"font-weight: 800; text-transform: uppercase; font-size: 0.95rem; margin-bottom: 0.25rem; color: #18181b;\">Extended Sizing Control</h4><p style=\"font-size: 0.95rem; line-height: 1.6; color: #4b5563;\">Clothing designed with flexibility, giving customers more control over their perfect fit.</p></div><div style=\"margin-bottom: 1.25rem;\"><h4 style=\"font-weight: 800; text-transform: uppercase; font-size: 0.95rem; margin-bottom: 0.25rem; color: #18181b;\">Uncompromised Quality</h4><p style=\"font-size: 0.95rem; line-height: 1.6; color: #4b5563;\">Carefully selected materials, thoughtful construction, and attention to detail.</p></div><div><h4 style=\"font-weight: 800; text-transform: uppercase; font-size: 0.95rem; margin-bottom: 0.25rem; color: #18181b;\">Tailored To Your Shape</h4><p style=\"font-size: 0.95rem; line-height: 1.6; color: #4b5563;\">Created for those who have often been overlooked by traditional sizing.</p></div></div>",
      "leftImage": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
      "rightImage": "",
      "leftWidth": "50",
      "gap": "large",
      "reverseOnMobile": true
    }
  },
  {
    "id": "block_spacer_8",
    "type": "spacer",
    "props": {
      "height": 60
    }
  }
];

async function run() {
  const id = "cmrmbvk6s0000o54dpcv3m3zs";
  const slug = "about-us";
  const content = JSON.stringify(blocks, null, 2);

  console.log("=== UPSERTING ABOUT US PAGE WITH IMAGES IN DB ===");
  const page = await prisma.page.upsert({
    where: { id },
    update: {
      title: "About Us",
      slug,
      content,
      published: true
    },
    create: {
      id,
      title: "About Us",
      slug,
      content,
      published: true
    }
  });

  console.log("SUCCESS! Page updated/created successfully with images:", JSON.stringify(page, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
