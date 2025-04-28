import pygame
import sys
import os

# --- Constants ---
SCREEN_WIDTH = 2560
SCREEN_HEIGHT = 1440
BACKGROUND_COLOR = (40, 40, 60) # Dark blue-grey background
PLAYER_SPEED = 5
FRAME_WIDTH = 100
FRAME_HEIGHT = 100
ANIMATION_COOLDOWN = 100 # milliseconds between animation frames

# --- Helper Function: Load Sprite Sheet ---
def load_sprite_sheet(filename, frame_width, frame_height):
    """Loads a sprite sheet and splits it into frames."""
    try:
        sheet = pygame.image.load(filename).convert_alpha()
    except pygame.error as e:
        raise Exception(f"Error loading sprite sheet: {filename} - {e}")


    frames = []
    sheet_width, sheet_height = sheet.get_size()
    cols = sheet_width // frame_width
    rows = sheet_height // frame_height # Assuming single row for horizontal sheets

    # Assuming horizontal layout only for now based on description
    if rows > 1:
        print(f"Warning: Sprite sheet '{filename}' has multiple rows, only processing the first.")

    for i in range(cols):
        rect = pygame.Rect(i * frame_width, 0, frame_width, frame_height)
        frame = sheet.subsurface(rect)
        # Scale the frame to increase size by 10 pixels in both dimensions
        scaled_frame = pygame.transform.scale(frame, (3*frame_width, 3*frame_height))
        frames.append(scaled_frame)
    return frames

# --- Player Class ---
class Player(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()

        self.animations = {}
        self.load_animations()

        # State variables
        self.state = 'idle' # 'idle', 'walk_right', 'walk_left', 'attack' 'hurt', 'death'
        self.current_frame = 0
        self.last_update = pygame.time.get_ticks()
        self.facing_right = True
        self.attacking = False
        self.attack_finished_this_frame = False # Flag to prevent immediate re-attack

        # Set initial image and rect
        if self.animations.get('idle'):
             self.image = self.animations['idle'][0]
        else:
             # Fallback if idle animation failed to load
             self.image = pygame.Surface((FRAME_WIDTH, FRAME_HEIGHT), pygame.SRCALPHA)
             self.image.fill((0, 255, 0)) # Green placeholder
        self.rect = self.image.get_rect(midbottom=(x, y))

        # Movement variables (can be expanded for physics later)
        self.velocity_x = 0 # Add velocity for smoother movement/physics later
        self.speed = PLAYER_SPEED

    def load_animations(self):
        """Load all animation frames."""
        # --- Walking ---
        walk_frames = load_sprite_sheet("images/hero-walk.png", FRAME_WIDTH, FRAME_HEIGHT)
        if walk_frames:
             self.animations['walk_right'] = walk_frames
             # Create mirrored frames for walking left
             self.animations['walk_left'] = [pygame.transform.flip(frame, True, False) for frame in walk_frames]
        else:
             print("Walk animation failed to load. Player movement animation unavailable.")
             self.animations['walk_right'] = []
             self.animations['walk_left'] = []


        # --- Idle ---
        idle_frames = load_sprite_sheet("images/hero-idle.png", FRAME_WIDTH, FRAME_HEIGHT)
        if idle_frames:
             self.animations['idle'] = idle_frames
        else:
             print("Idle animation failed to load. Player idle animation unavailable.")
             self.animations['idle'] = []


        # --- Attack ---
        # User provided Soldier-Attack01.png
        attack_frames = load_sprite_sheet("images/hero-attack1.png", FRAME_WIDTH, FRAME_HEIGHT)
        if attack_frames:
             self.animations['attack_right'] = attack_frames
             self.animations['attack_left'] = [pygame.transform.flip(frame, True, False) for frame in attack_frames]
        else:
            print("Attack animation failed to load. Player attack animation unavailable.")
            self.animations['attack_right'] = []
            self.animations['attack_left'] = []

        # --- Animation Stubs ---
        # Load these similarly when you have the assets
        self.animations['hurt'] = [] # e.g., load_sprite_sheet("SoldierHurt.png", ...)
        self.animations['death'] = [] # e.g., load_sprite_sheet("SoldierDeath.png", ...)

        print(f"Animation frames loaded: { {k: len(v) for k, v in self.animations.items()} }")


    def update(self, keys):
        """Update player state based on input and time."""
        now = pygame.time.get_ticks()
        self.velocity_x = 0 # Reset horizontal velocity each frame for simple key control

        # --- Handle Input ---
        # Attack input has priority if not already attacking
        if keys[pygame.K_SPACE] and not self.attacking:
            self.attacking = True
            self.current_frame = 0 # Start attack animation from beginning
            self.state = 'attack_right' if self.facing_right else 'attack_left'
            self.last_update = now # Reset timer for new animation
            self.attack_finished_this_frame = False

        # Movement input (only if not attacking)
        if not self.attacking:
            if keys[pygame.K_LEFT]:
                self.velocity_x = -self.speed
                self.state = 'walk_left'
                self.facing_right = False
            elif keys[pygame.K_RIGHT]:
                self.velocity_x = self.speed
                self.state = 'walk_right'
                self.facing_right = True
            else:
                # No movement keys pressed, stay idle
                 # Ensure state reverts to idle only if it was a walking state
                 if self.state in ['walk_left', 'walk_right']:
                      self.state = 'idle'
                 # If already idle, or some other non-walking state, leave it


            # If state changed to non-idle, non-attack, reset frame index
            if self.state != 'idle' and self.state not in ['attack_right', 'attack_left'] and self.current_frame != 0 :
                 # This logic might need adjustment depending on how you want transitions
                 # If starting to walk from idle, maybe start frame 0.
                 pass # Current frame logic handled in animate

        # --- Apply Movement ---
        self.rect.x += self.velocity_x

        # --- Keep player on screen (basic boundary check) ---
        if self.rect.left < 0:
            self.rect.left = 0
        if self.rect.right > SCREEN_WIDTH:
            self.rect.right = SCREEN_WIDTH
        # Add bottom boundary if needed (e.g., self.rect.bottom > SCREEN_HEIGHT)

        # --- Handle Animation ---
        self.animate(now)

    def animate(self, current_time):
        """Cycle through animation frames."""

        # Get the correct list of frames for the current state
        current_animation_key = self.state
        # If idle, there's only one set (no direction needed)
        if self.state == 'idle' and 'idle' in self.animations:
             animation_frames = self.animations['idle']
        # Handle directed states (walk, attack)
        elif self.state in self.animations:
             animation_frames = self.animations[self.state]
        else:
             # Fallback if state animation is missing (e.g., hurt/death not loaded yet)
             if 'idle' in self.animations and self.animations['idle']:
                 animation_frames = self.animations['idle'] # Default to idle
             else:
                  # Absolute fallback: no animations loaded at all
                  # Keep the placeholder image set in __init__
                  return # Nothing to animate


        # Prevent crash if an animation list is unexpectedly empty
        if not animation_frames:
             # print(f"Warning: Animation list for state '{self.state}' is empty.")
             # Keep the last valid image or placeholder
             return

        # Check if enough time has passed for the next frame
        if current_time - self.last_update > ANIMATION_COOLDOWN:
            self.last_update = current_time
            self.current_frame = (self.current_frame + 1)

            # Check if animation finished
            if self.current_frame >= len(animation_frames):
                if self.attacking:
                    # Finished attack animation
                    self.attacking = False
                    self.state = 'idle' # Revert to idle after attacking
                    self.current_frame = 0 # Reset frame index for idle animation
                    self.attack_finished_this_frame = True # Mark attack as done
                    # Update animation_frames for the new 'idle' state immediately
                    if 'idle' in self.animations and self.animations['idle']:
                         animation_frames = self.animations['idle']
                    else: # Handle case where idle is also missing
                         return # Or keep last frame of attack?


                else:
                    # Loop non-attacking animations (walk, idle)
                    self.current_frame = 0

            # Ensure frame index is valid after potential reset
            if self.current_frame < len(animation_frames):
                 # Update the image
                 new_image = animation_frames[self.current_frame]
                 # Preserve position when changing frames (important if frames have different padding)
                 old_center = self.rect.center
                 self.image = new_image
                 self.rect = self.image.get_rect(center=old_center)
            # else: # This case should ideally not be hit with the logic above
            #      print(f"Warning: Invalid frame index {self.current_frame} for state {self.state}")
            #      self.current_frame = 0 # Force reset


# --- Game Initialization ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.FULLSCREEN)
pygame.display.set_caption("Platformer Prototype")
clock = pygame.time.Clock()

# Load and scale the background image
try:
    background_image = pygame.image.load("./images/background.png").convert() # Use convert() for performance
    background_image = pygame.transform.scale(background_image, (SCREEN_WIDTH, SCREEN_HEIGHT))
except pygame.error as e:
    print(f"Error loading background.png: {e}")
    # Create a fallback background color if image fails to load
    background_image = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
    background_image.fill(BACKGROUND_COLOR)


# --- Game Objects ---
player = Player(SCREEN_WIDTH // 2, SCREEN_HEIGHT - FRAME_HEIGHT // 2 ) # Start near bottom center
all_sprites = pygame.sprite.Group()
all_sprites.add(player)

# --- Game Loop ---
running = True
while running:
    # Keep loop running at the right speed
    dt = clock.tick(60) # Delta time in milliseconds (useful for frame-independent physics later)

    # Process input (events)
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                running = False
        # Add more event handling here (e.g., KEYDOWN for jump)

    # Get pressed keys for continuous actions (movement)
    keys = pygame.key.get_pressed()

    # Update
    all_sprites.update(keys) # Pass keys state to player's update

    # Draw / Render
    screen.blit(background_image, (0, 0)) # Draw the background image
    all_sprites.draw(screen) # Pygame draws all sprites in the group

    # *after* drawing everything, flip the display
    pygame.display.flip()

# --- Cleanup ---
pygame.quit()
sys.exit()